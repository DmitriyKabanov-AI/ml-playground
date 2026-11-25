"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

export type MapData = { version: number; file: string; record_bytes: number; states: string[]; total: number; valid: number; balanced: number; balanced_per_class: number; accuracy: number; model: string; data_fraction?: number };
const BASE = "/artifacts/classification/accident_severity/";
const CDN = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/";
const USA = [[-125,24],[-66,50]];
const STATES: Record<string,string> = { AL:"Алабама",AK:"Аляска",AZ:"Аризона",AR:"Арканзас",CA:"Калифорния",CO:"Колорадо",CT:"Коннектикут",DE:"Делавэр",DC:"Округ Колумбия",FL:"Флорида",GA:"Джорджия",HI:"Гавайи",ID:"Айдахо",IL:"Иллинойс",IN:"Индиана",IA:"Айова",KS:"Канзас",KY:"Кентукки",LA:"Луизиана",ME:"Мэн",MD:"Мэриленд",MA:"Массачусетс",MI:"Мичиган",MN:"Миннесота",MS:"Миссисипи",MO:"Миссури",MT:"Монтана",NE:"Небраска",NV:"Невада",NH:"Нью-Гэмпшир",NJ:"Нью-Джерси",NM:"Нью-Мексико",NY:"Нью-Йорк",NC:"Северная Каролина",ND:"Северная Дакота",OH:"Огайо",OK:"Оклахома",OR:"Орегон",PA:"Пенсильвания",RI:"Род-Айленд",SC:"Южная Каролина",SD:"Южная Дакота",TN:"Теннесси",TX:"Техас",UT:"Юта",VT:"Вермонт",VA:"Виргиния",WA:"Вашингтон",WV:"Западная Виргиния",WI:"Висконсин",WY:"Вайоминг" };
const COLORS = ["#34d399", "#0ea5e9", "#f59e0b", "#f43f5e"];
const desc = ["минимальное влияние", "небольшое влияние", "значительное влияние", "максимальное влияние"];
const GEO = "https://cdn.jsdelivr.net/gh/PublicaMundi/MappingAPI@master/data/geojson/us-states.json";
const EN: Record<string,string> = Object.fromEntries("Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming".split("|").map((name,i)=>[name,Object.keys(STATES)[i]]));
type StateMetric = "share"|"count";
const ALL_CLASSES = -1;
const ALL_COLOR = "#6366f1";
const stateClassColor = (k:number) => k===ALL_CLASSES ? ALL_COLOR : COLORS[k];
type GeoFeature = {type:string;geometry:{type:string;coordinates:unknown};properties:Record<string,unknown>};
type Geo = {type:"FeatureCollection";features:GeoFeature[]};
const cls = (n:number) => `S${n+1} (${desc[n]})`;
const fmt = (n:number) => n.toLocaleString("ru-RU");
const pct = (n:number,d:number) => d ? (100*n/d).toLocaleString("ru-RU",{maximumFractionDigits:1,minimumFractionDigits:1})+"%" : "—";
const mercY = (lat:number) => (1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
type Visual = "points"|"clusters"|"heat"|"states";
type Row = {key:string;name:string;n:number;classes:number[];shown:number;x:number;y:number};
type Data = {view:DataView; xy:Float32Array; valid:Uint8Array; stateCounts:Uint32Array; bounds:number[][]; meta:MapData};
// MapLibre загружается только в разделе аварий; проект не требует изменений npm/lockfile.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let library:Promise<any>|undefined;
function loadLibrary(){
  if(library) return library;
  library=new Promise((resolve,reject)=>{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w=window as any; if(w.maplibregl){resolve(w.maplibregl);return;}
    const css=document.createElement("link"), js=document.createElement("script");
    css.rel="stylesheet";css.href=CDN+"maplibre-gl.css";js.src=CDN+"maplibre-gl.js";js.async=true;
    let a=false,b=false;const done=()=>{if(a&&b){clearTimeout(timer);resolve(w.maplibregl);}};
    const fail=()=>{clearTimeout(timer);css.remove();js.remove();reject(new Error("Не удалось загрузить MapLibre GL"));};
    const timer=window.setTimeout(fail,20000);css.onload=()=>{a=true;done();};js.onload=()=>{b=true;done();};css.onerror=js.onerror=fail;document.head.append(css,js);
  }).catch(e=>{library=undefined;throw e;});return library;
}
function decode(buffer:ArrayBuffer,meta:MapData):Data{
  const stride=meta.record_bytes;
  if(!((meta.version===1&&stride===20)||(meta.version===2&&stride===32))||buffer.byteLength!==meta.total*stride)throw new Error("Файл точек не соответствует отчёту. Пересоберите артефакты.");
  const view=new DataView(buffer),xy=new Float32Array(meta.total*2),valid=new Uint8Array(meta.total),stateCounts=new Uint32Array(meta.states.length);let n=0,b=0,west=180,east=-180,south=90,north=-90;
  for(let i=0;i<meta.total;i++){const o=i*stride,x=view.getFloat64(o,true),y=view.getFloat64(o+8,true);if(view.getUint8(o+16)>=meta.states.length||view.getUint8(o+17)>3||view.getUint8(o+18)>3||view.getUint8(o+19)>1)throw new Error("Некорректные классы в файле карты");
    if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=85.05112878&&(x!==0||y!==0)){valid[i]=1;n++;stateCounts[view.getUint8(o+16)]++;west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);xy[i*2]=(x+180)/360;xy[i*2+1]=mercY(y);if(view.getUint8(o+19))b++;}}
  if(n!==meta.valid||(meta.version===1&&b!==meta.balanced))throw new Error("Количество точек не совпадает с отчётом");return {view,xy,valid,stateCounts,bounds:n?[[Math.min(west,-125),Math.min(south,24)],[Math.max(east,-66),Math.max(north,50)]]:USA,meta};
}
// All valid test records, no equal-class sampling and no model-error filtering.
function calculate(d:Data,state:string,severity:string,collect=true){
  const groups=d.meta.states.map(key=>({key,name:STATES[key]||key,n:0,classes:[0,0,0,0],shown:0,x:0,y:0}));
  const indices=new Uint32Array(collect?d.meta.total:0),vertices=new Float32Array(collect?d.meta.total*3:0);let n=0;const classes=[0,0,0,0];
  for(let i=0;i<d.meta.total;i++){if(!d.valid[i])continue;const o=i*d.meta.record_bytes,a=d.view.getUint8(o+17),si=d.view.getUint8(o+16),row=groups[si];
    row.n++;row.classes[a]++;row.x+=d.view.getFloat64(o,true);row.y+=d.view.getFloat64(o+8,true);
    if((state&&row.key!==state)||(severity!==""&&a!==Number(severity)))continue;
    row.shown++;classes[a]++;if(collect){indices[n]=i;vertices[n*3]=d.xy[i*2];vertices[n*3+1]=d.xy[i*2+1];vertices[n*3+2]=a;}n++;
  }
  return {rows:groups,indices:indices.subarray(0,n),vertices:vertices.subarray(0,n*3),n,classes};
}
// For all classes, compare each state's share of the entire mapped US test set.
// For one class, keep the original within-state denominator.
const stateCount=(r:Row,k:number)=>k===ALL_CLASSES?r.n:r.classes[k];
const stateDenominator=(r:Row,k:number,total:number)=>k===ALL_CLASSES?total:r.n;
const stateValue=(r:Row,k:number,metric:StateMetric,total:number)=>{
  const n=stateCount(r,k),d=stateDenominator(r,k,total);
  return metric==="count"?n:d?n/d:0;
};
function stateColor(r:Row|undefined,k:number,metric:StateMetric,max:number,total:number){
  if(!r||!r.n)return "#94a3b8";
  const t=stateValue(r,k,metric,total)/(max||1);
  const color=stateClassColor(k);const rgb=[1,3,5].map(i=>Math.round(240+(parseInt(color.slice(i,i+2),16)-240)*Math.max(0,Math.min(t,1))));
  return `rgb(${rgb.join(",")})`;
}
function stateFeatures(geo:Geo,rows:Row[],k:number,metric:StateMetric,selected:string){
  const total=rows.reduce((sum,r)=>sum+r.n,0),by=new Map(rows.map(r=>[r.key,r])),max=Math.max(0,...rows.map(r=>stateValue(r,k,metric,total))),seen=new Set<string>();const features:GeoFeature[]=[];
  for(const f of geo.features){const key=EN[String(f.properties.name)];if(!key)continue;seen.add(key);const r=by.get(key);features.push({...f,properties:{key,color:stateColor(r,k,metric,max,total),selected:key===selected,hasData:!!r?.n}});}
  // In the absence of a boundary, still provide an honest geographic summary marker
  // at the average location of the accidents of that state (not its legal centroid).
  for(const r of rows)if(r.n&&!seen.has(r.key))features.push({type:"Feature",geometry:{type:"Point",coordinates:[r.x/r.n,r.y/r.n]},properties:{key:r.key,color:stateColor(r,k,metric,max,total),selected:r.key===selected,hasData:true}});
  return {type:"FeatureCollection",features};
}
function popupText(text:string){const node=document.createElement("div");node.style.cssText="font:13px/1.5 system-ui;color:#17223b;white-space:pre-line;max-width:250px";node.textContent=text;return node;}
function makePainter(canvas:HTMLCanvasElement){
  const context=canvas.getContext("webgl",{alpha:true,antialias:false,premultipliedAlpha:false});if(!context)throw new Error("WebGL недоступен: включите аппаратное ускорение браузера.");const gl:WebGLRenderingContext=context;
  const shader=(kind:number,src:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Ошибка WebGL");return s;};
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 a; uniform vec2 origin; uniform vec2 scale; uniform float size; varying float kind; void main(){gl_Position=vec4(origin+a.xy*scale,0.,1.);kind=a.z;gl_PointSize=size;}`);
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float; varying float kind; void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;vec3 c=kind<.5?vec3(.204,.827,.6):kind<1.5?vec3(.055,.647,.914):kind<2.5?vec3(.961,.620,.043):vec3(.957,.247,.369);if(r>.43)c=mix(c,vec3(1.),.45);gl_FragColor=vec4(c,.90);}`);
  const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Ошибка программы WebGL");gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  const buf=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buf);const a=gl.getAttribLocation(program,"a");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);
  const origin=gl.getUniformLocation(program,"origin"),scale=gl.getUniformLocation(program,"scale"),size=gl.getUniformLocation(program,"size");let count=0;
  return {set(v:Float32Array){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);count=v.length/3;},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draw(map:any){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);const p=map.project([0,0]),p1=map.project([1,0]),world=(p1.x-p.x)*360;gl.useProgram(program);gl.uniform2f(origin,2*(p.x-world/2)/w-1,1-2*(p.y-world/2)/h);gl.uniform2f(scale,2*world/w,-2*world/h);gl.uniform1f(size,(map.getZoom()<5?2.5:map.getZoom()<9?4:6)*dpr);gl.drawArrays(gl.POINTS,0,count);},
    dispose(){gl.deleteBuffer(buf);gl.deleteProgram(program);}};
}
function polishBasemap(map: any, dark: boolean) {
  const p = dark ? { land: "#121c2c", water: "#0b1424", park: "#172d32", road: "#39465a", boundary: "#64748b", label: "#bac9df", building: "#202d3f" }
    : { land: "#f1f5fb", water: "#dceaf8", park: "#e1efec", road: "#c6d2e2", boundary: "#8799b1", label: "#53647b", building: "#e3eaf4" };
  for (const layer of (map.getStyle().layers ?? [])) {
    if (layer.id.startsWith("accident-")) continue;
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", p.land);
      else if (layer.type === "fill") map.setPaintProperty(layer.id, "fill-color", /water|ocean|sea|lake|river/.test(id) ? p.water : /park|wood|forest|nature|grass|green/.test(id) ? p.park : /building/.test(id) ? p.building : p.land);
      else if (layer.type === "line") {
        const boundary = /border|admin|boundary/.test(id);
        map.setPaintProperty(layer.id, "line-color", boundary ? p.boundary : /water|river|stream/.test(id) ? p.water : p.road);
        map.setPaintProperty(layer.id, "line-opacity", boundary ? 0.85 : 0.55);
      } else if (layer.type === "symbol") {
        // Preserve the style's original visibility when switching themes.
        map.setPaintProperty(layer.id, "text-color", p.label);
        map.setPaintProperty(layer.id, "text-halo-color", p.land);
        map.setPaintProperty(layer.id, "text-halo-width", 1.2);
      } else if (layer.type === "fill-extrusion") map.setPaintProperty(layer.id, "fill-extrusion-color", p.building);
    } catch { /* Some provider layers do not support these paint properties. */ }
  }
}

const VISUALS: {id:Visual;label:string;note:string}[] = [
  {id:"points",label:"Метки",note:"Одна метка — одна авария. Цвет — её реальный класс. Нажмите, чтобы открыть карточку."},
  {id:"clusters",label:"Кластеры",note:"Число в круге — количество аварий поблизости, цвет — самый частый класс в группе. Нажмите для состава и приближения."},
  {id:"heat",label:"Тепловая карта",note:"Цвет показывает концентрацию выбранных аварий. Выберите класс, чтобы увидеть, где он встречается чаще."},
  {id:"states",label:"По штатам",note:"Сравнение штатов по числу и доле аварий выбранного класса или всех классов."},
];
const EMPTY={type:"FeatureCollection",features:[]};
const CLUSTER="accident-clusters",COUNT="accident-count", SINGLE="accident-single",HEAT="accident-heat";
const inverseY=(y:number)=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;
type Result=ReturnType<typeof calculate>;
type Bin={x:number;y:number;n:number;classes:number[];index:number};
// Every filtered accident is counted, including identical coordinates. At a given zoom,
// group nearby points in screen-space cells; only cells near the viewport need rendering.
// Heat uses much finer cells, weighted by the number of real records, never a sample.
function binsForView(result:Result, map:any, visual:Visual){
  const zoom=map.getZoom(),world=512*Math.pow(2,Math.floor(zoom));
  const step=(visual==="heat"?4:46)/world;
  const w=map.getCanvas().clientWidth,h=map.getCanvas().clientHeight;
  const a=map.unproject([-100,-100]),b=map.unproject([w+100,h+100]);
  const minX=(Math.min(a.lng,b.lng)+180)/360,maxX=(Math.max(a.lng,b.lng)+180)/360;
  const minY=mercY(Math.max(a.lat,b.lat)),maxY=mercY(Math.min(a.lat,b.lat));
  const groups=new Map<number,Bin>(),stride=Math.ceil(1/step)+2;
  for(let i=0;i<result.n;i++){
    const x=result.vertices[i*3],y=result.vertices[i*3+1],kind=result.vertices[i*3+2];
    if(x<minX||x>maxX||y<minY||y>maxY)continue;
    const key=Math.floor(y/step)*stride+Math.floor(x/step);
    let g=groups.get(key);if(!g){g={x:0,y:0,n:0,classes:[0,0,0,0],index:result.indices[i]};groups.set(key,g);}
    g.x+=x;g.y+=y;g.n++;g.classes[kind]++;
  }
  return {type:"FeatureCollection",features:Array.from(groups.values(),g=>({type:"Feature",geometry:{type:"Point",coordinates:[g.x/g.n*360-180,inverseY(g.y/g.n)]},properties:{count:g.n,s1:g.classes[0],s2:g.classes[1],s3:g.classes[2],s4:g.classes[3],index:g.index,color:COLORS[g.classes.indexOf(Math.max(...g.classes))]}}))};
}
function addVisualLayers(map:any){
  const font=map.getStyle().layers?.find((l:any)=>l.type==="symbol"&&Array.isArray(l.layout?.["text-font"])&&l.layout["text-font"].every((v:unknown)=>typeof v==="string"))?.layout?.["text-font"];
  map.addSource("accident-states",{type:"geojson",data:EMPTY});
  map.addLayer({id:"accident-state-fill",type:"fill",source:"accident-states",filter:["==",["geometry-type"],"Polygon"],layout:{visibility:"none"},paint:{"fill-color":["get","color"],"fill-opacity":0.75}});
  map.addLayer({id:"accident-state-outline",type:"line",source:"accident-states",filter:["==",["geometry-type"],"Polygon"],layout:{visibility:"none"},paint:{"line-color":["case",["get","selected"],"#6366f1","#64748b"],"line-width":["case",["get","selected"],3,1]}});
  map.addLayer({id:"accident-state-fallback",type:"circle",source:"accident-states",filter:["==",["geometry-type"],"Point"],layout:{visibility:"none"},paint:{"circle-radius":18,"circle-color":["get","color"],"circle-stroke-width":["case",["get","selected"],3,1],"circle-stroke-color":"#64748b"}});
  map.addSource("accident-bins",{type:"geojson",data:EMPTY});
  map.addLayer({id:HEAT,type:"heatmap",source:"accident-bins",layout:{visibility:"none"},paint:{
    "heatmap-weight":["get","count"],"heatmap-intensity":["interpolate",["linear"],["zoom"],2,0.015,5,0.08,9,0.3,14,1],
    "heatmap-radius":["interpolate",["linear"],["zoom"],2,16,7,30,15,46],
    "heatmap-color":["interpolate",["linear"],["heatmap-density"],0,"rgba(37,99,235,0)",0.15,"#2563eb",0.35,"#06b6d4",0.55,"#34d399",0.75,"#fbbf24",1,"#f43f5e"],"heatmap-opacity":0.85}});
  map.addLayer({id:SINGLE,type:"circle",source:"accident-bins",filter:["==",["get","count"],1],layout:{visibility:"none"},paint:{"circle-color":["get","color"],"circle-radius":["interpolate",["linear"],["zoom"],2,3,5,4,10,6,15,9],"circle-opacity":0.9,"circle-stroke-width":0.8,"circle-stroke-color":"#fff"}});
  map.addLayer({id:CLUSTER,type:"circle",source:"accident-bins",filter:[">",["get","count"],1],layout:{visibility:"none"},paint:{"circle-color":["get","color"],"circle-radius":["step",["get","count"],15,30,21,100,28,1000,33,10000,39],"circle-opacity":0.92,"circle-stroke-width":1.5,"circle-stroke-color":"#e2e8f0"}});
  map.addLayer({id:COUNT,type:"symbol",source:"accident-bins",filter:[">",["get","count"],1],layout:{visibility:"none","text-field":["to-string",["get","count"]],"text-font":font??["Noto Sans Regular"],"text-size":12,"text-allow-overlap":true,"text-ignore-placement":true},paint:{"text-color":"#fff"}});
}
function layerMode(map:any,visual:Visual){
  for(const id of [CLUSTER,COUNT,SINGLE,HEAT])map.setLayoutProperty(id,"visibility",(visual==="clusters"&&id!==HEAT)||(visual==="heat"&&id===HEAT)?"visible":"none");
  for(const id of ["accident-state-fill","accident-state-outline","accident-state-fallback"])map.setLayoutProperty(id,"visibility",visual==="states"?"visible":"none");
}
function pointInfo(d:Data,index:number){
  const o=index*d.meta.record_bytes,v=d.view,a=v.getUint8(o+17),p=v.getUint8(o+18),s=d.meta.states[v.getUint8(o+16)],rich=d.meta.version===2;
  return {coord:[v.getFloat64(o,true),v.getFloat64(o+8,true)],a,p,s,hour:rich?v.getUint8(o+20):255,temp:rich?v.getFloat32(o+24,true):NaN,visibility:rich?v.getFloat32(o+28,true):NaN};
}
function pointPopup(d:Data,r:Result,index:number){
  const root=document.createElement("div");root.style.cssText="font:12px/1.55 Inter,system-ui,sans-serif;color:#17223b;min-width:190px;max-width:260px;padding:4px;";
  const detail=document.createElement("div");root.append(detail);
  const {coord:[x,y]}=pointInfo(d,index),stride=d.meta.record_bytes;
  const same:number[]=[];for(const i of r.indices){if(d.view.getFloat64(i*stride,true)===x&&d.view.getFloat64(i*stride+8,true)===y)same.push(i);}
  let at=Math.max(0,same.indexOf(index));
  const render=()=>{const s=pointInfo(d,same[at]??index);detail.replaceChildren();const title=document.createElement("strong");title.style.fontSize="14px";title.textContent=`${STATES[s.s]||s.s} (${s.s})${s.hour<24?` · ${String(s.hour).padStart(2,"0")}:00`:""}`;detail.append(title);
    const row=(label:string,value:string,color?:string)=>{const line=document.createElement("div"),text=document.createElement("span"),val=document.createElement("b");text.textContent=label+": ";val.textContent=value;if(color)val.style.color=color;line.append(text,val);detail.append(line);};
    row("Реальная тяжесть",cls(s.a),COLORS[s.a]);row("Ответ модели",cls(s.p),COLORS[s.p]);row("Результат",s.a===s.p?"Верно":`Модель ${s.p<s.a?"занизила":"завысила"} тяжесть (${Math.abs(s.a-s.p)} ур.)`,s.a===s.p?"#059669":"#e11d48");
    row("Температура",Number.isFinite(s.temp)?`${((s.temp-32)*5/9).toFixed(1)} °C`:"—");row("Видимость",Number.isFinite(s.visibility)?`${(s.visibility*1.609344).toFixed(1)} км`:"—");row("Координаты",`${s.coord[1].toFixed(5)}, ${s.coord[0].toFixed(5)}`);
  };render();
  if(same.length>1){const nav=document.createElement("div");nav.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;";const prev=document.createElement("button"),next=document.createElement("button"),label=document.createElement("span");prev.textContent="‹";next.textContent="›";prev.setAttribute("aria-label","Предыдущая авария");next.setAttribute("aria-label","Следующая авария");for(const b of [prev,next])b.style.cssText="border:1px solid #cbd5e1;border-radius:5px;padding:2px 10px;";const update=()=>{label.textContent=`${at+1} из ${same.length}`;prev.disabled=at===0;next.disabled=at===same.length-1;render();};prev.onclick=()=>{at=Math.max(0,at-1);update();};next.onclick=()=>{at=Math.min(same.length-1,at+1);update();};nav.append(prev,label,next);root.append(nav);update();}
  return root;
}
function statePopup(row:Row){return popupText(`${row.name} (${row.key})\nВсего аварий: ${fmt(row.n)}\n${row.classes.map((n,i)=>`S${i+1}: ${fmt(n)} (${pct(n,row.n)})`).join("\n")}`);}
function nearest(map:any,result:Result,point:{x:number;y:number}){const p=map.project([0,0]),p1=map.project([1,0]),world=(p1.x-p.x)*360;const x=(point.x-p.x)/world+.5,y=(point.y-p.y)/world+.5;let best=100/(world*world),index=-1;for(let i=0;i<result.n;i++){const dx=result.vertices[i*3]-x,dy=result.vertices[i*3+1]-y,dd=dx*dx+dy*dy;if(dd<=best){best=dd;index=result.indices[i];}}return index;}
function fitPoints(map:any,d:Data,r:Result){if(!r.n)return;let west=180,east=-180,south=90,north=-90;for(const i of r.indices){const x=d.view.getFloat64(i*d.meta.record_bytes,true),y=d.view.getFloat64(i*d.meta.record_bytes+8,true);west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}map.fitBounds(east-west>180?USA:[[west,south],[east,north]],{padding:42,duration:450,maxZoom:11});}

function fitState(map:any,d:Data,state:string){const si=d.meta.states.indexOf(state);let west=180,east=-180,south=90,north=-90;for(let i=0;i<d.meta.total;i++){if(!d.valid[i]||d.view.getUint8(i*d.meta.record_bytes+16)!==si)continue;const x=d.view.getFloat64(i*d.meta.record_bytes,true),y=d.view.getFloat64(i*d.meta.record_bytes+8,true);west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}if(west<=east)map.fitBounds([[west,south],[east,north]],{padding:42,duration:450,maxZoom:9});}

export default function AccidentGeoMap({meta}:{meta:MapData}){
  const theme=useAppStore(s=>s.theme);
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[mapError,setMapError]=useState(""),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0),[tileError,setTileError]=useState(false);
  const [visual,setVisual]=useState<Visual>("points"),[state,setState]=useState(""),[severity,setSeverity]=useState("");
  const [stateClass,setStateClass]=useState(3),[stateMetric,setStateMetric]=useState<StateMetric>("share"),[geo,setGeo]=useState<Geo>({type:"FeatureCollection",features:[]}),[geoStatus,setGeoStatus]=useState<"idle"|"loading"|"ready"|"error">("idle");
  type SortKey="name"|"n"|"s0"|"s1"|"s2"|"s3"|"share";
  const [sort,setSort]=useState<{key:SortKey;asc:boolean}>({key:"n",asc:false});
  const host=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),popup=useRef<any>(null),canvasRef=useRef<HTMLCanvasElement|null>(null),painter=useRef<ReturnType<typeof makePainter>|null>(null);
  useEffect(()=>{const controller=new AbortController();setData(null);setError("");fetch(BASE+encodeURIComponent(meta.file),{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Не найден файл точек. Выполните обновлённый ноутбук.");return r.arrayBuffer();}).then(b=>{if(!controller.signal.aborted)setData(decode(b,meta));}).catch(e=>{if(!controller.signal.aborted)setError(String(e.message||e));});return()=>controller.abort();},[meta,attempt]);
  useEffect(()=>{if(visual!=="states")return;const controller=new AbortController();setGeoStatus("loading");const timeout=window.setTimeout(()=>controller.abort(),18000);let active=true;fetch(GEO,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error("Границы недоступны");return r.json();}).then((g:Geo)=>{if(!active)return;if(g.type!=="FeatureCollection"||!Array.isArray(g.features)||!g.features.some(f=>EN[String(f.properties?.name)]))throw Error("Некорректные границы");setGeo(g);setGeoStatus("ready");}).catch(()=>{if(active)setGeoStatus("error");}).finally(()=>clearTimeout(timeout));return()=>{active=false;clearTimeout(timeout);controller.abort();};},[visual,attempt]);
  const stateMode=visual==="states";
  const result=useMemo(()=>data?calculate(data,state,stateMode?"":severity,!stateMode):null,[data,state,severity,stateMode]);
  const rows=result?.rows??[];
  const totalStateCount=rows.reduce((sum,r)=>sum+r.n,0);
  const shareLabel=stateClass===ALL_CLASSES?"Доля всех аварий США":`Доля S${stateClass+1}`;
  const table=useMemo(()=>[...(result?.rows??[])].filter(r=>r.n>0).sort((a,b)=>{const k=sort.key;const f=k==="name"?a.name.localeCompare(b.name,"ru"):k==="n"?a.n-b.n:k==="share"?stateValue(a,stateClass,"share",totalStateCount)-stateValue(b,stateClass,"share",totalStateCount):a.classes[Number(k.slice(1))]-b.classes[Number(k.slice(1))];return sort.asc?f:-f;}),[result,sort,stateClass,totalStateCount]);
  const latest=useRef({data,result,visual,theme,state});latest.current={data,result,visual,theme,state};
  useEffect(()=>{let dead=false,loaded=false;let observer:ResizeObserver|undefined;let timer:number|undefined;let map:any;let lib:any;setReady(false);setMapError("");setTileError(false);
    const refresh=()=>{const {visual:v,result:r}=latest.current;if(!loaded||!r||!map)return;if(v==="clusters"||v==="heat")map.getSource("accident-bins")?.setData(binsForView(r,map,v));};
    void loadLibrary().then(l=>{if(dead||!host.current)return;lib=l;map=new lib.Map({container:host.current,style:"https://tiles.openfreemap.org/styles/liberty",center:[-96,38],zoom:3,minZoom:1,maxZoom:15,maxPitch:0,pitchWithRotate:false,dragRotate:false,touchPitch:false,renderWorldCopies:false,attributionControl:true});mapRef.current=map;map.touchZoomRotate?.disableRotation();map.keyboard?.disableRotation();map.addControl(new lib.NavigationControl({showCompass:false}),"top-right");map.addControl(new lib.ScaleControl({maxWidth:110,unit:"metric"}),"bottom-left");
      timer=window.setTimeout(()=>{if(!dead&&!loaded)setMapError("Географическая подложка не загрузилась. Проверьте доступ к OpenFreeMap.");},25000);
      map.on("load",()=>{if(dead)return;try{clearTimeout(timer);polishBasemap(map,latest.current.theme==="dark");addVisualLayers(map);const canvas=document.createElement("canvas");canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";host.current!.insertBefore(canvas,map.getCanvasContainer().nextSibling);canvasRef.current=canvas;painter.current=makePainter(canvas);canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();setMapError("Потерян графический контекст. Нажмите «Повторить».");});map.on("render",()=>{if(latest.current.visual==="points")painter.current?.draw(map);});map.fitBounds(USA,{padding:28,duration:0,maxZoom:5});loaded=true;setReady(true);setMapError("");}catch(e){setMapError(String(e));}});
      map.on("moveend",refresh);map.on("resize",refresh);map.on("error",(e:any)=>{if(!dead&&loaded&&e.error)setTileError(true);});
      map.on("click",(e:any)=>{if(!loaded)return;const {data:d,result:r,visual:v}=latest.current;if(!d||!r||v==="heat")return;let index=-1;popup.current?.remove();popup.current=null;
        if(v==="states"){const f=map.queryRenderedFeatures(e.point,{layers:["accident-state-fill","accident-state-fallback"]})[0];if(!f)return;const row=r.rows.find(t=>t.key===f.properties.key);if(!row||!row.n)return;const root=statePopup(row);const btn=document.createElement("button");btn.textContent="Показать аварии штата";btn.style.cssText="display:block;margin-top:8px;color:#4f46e5;font-weight:600";btn.onclick=()=>{setState(row.key);setSeverity("");setVisual("points");};root.append(btn);popup.current=new lib.Popup({maxWidth:"300px"}).setLngLat(e.lngLat).setDOMContent(root).addTo(map);return;}
        if(v==="clusters"){const f=map.queryRenderedFeatures(e.point,{layers:[CLUSTER,COUNT,SINGLE]})[0];if(!f)return;const props=f.properties;if(Number(props.count)>1){const root=popupText(`Аварий в группе: ${fmt(Number(props.count))}\n${[1,2,3,4].map(k=>`S${k}: ${fmt(Number(props['s'+k]))}`).join("\n")}`);const btn=document.createElement("button");btn.textContent="Приблизить";btn.style.cssText="display:block;margin-top:8px;color:#4f46e5;font-weight:600";btn.onclick=()=>{if(map.getZoom()<15)map.easeTo({center:f.geometry.coordinates,zoom:Math.min(15,map.getZoom()+2),duration:450});else setVisual("points");};if(map.getZoom()>=15)btn.textContent="К отдельным меткам";root.append(btn);popup.current=new lib.Popup({maxWidth:"300px"}).setLngLat(f.geometry.coordinates).setDOMContent(root).addTo(map);return;}index=Number(props.index);}else index=nearest(map,r,e.point);
        if(index<0)return;const info=pointInfo(d,index);popup.current=new lib.Popup({maxWidth:"300px",offset:12}).setLngLat(info.coord).setDOMContent(pointPopup(d,r,index)).addTo(map);
      });observer=new ResizeObserver(()=>map.resize());observer.observe(host.current);
    }).catch(e=>{if(!dead)setMapError(String(e.message||e));});
    return()=>{dead=true;clearTimeout(timer);observer?.disconnect();popup.current?.remove();popup.current=null;painter.current?.dispose();painter.current=null;canvasRef.current?.remove();canvasRef.current=null;map?.remove();mapRef.current=null;};
  },[attempt]);
  useEffect(()=>{if(!ready||!mapRef.current)return;const map=mapRef.current;popup.current?.remove();popup.current=null;layerMode(map,visual);if(canvasRef.current)canvasRef.current.style.display=visual==="points"?"block":"none";
    if(visual==="points"){map.getSource("accident-bins")?.setData(EMPTY);painter.current?.set(result?.vertices??new Float32Array());}
    else{painter.current?.set(new Float32Array());map.getSource("accident-bins")?.setData(result&&visual!=="states"?binsForView(result,map,visual):EMPTY);}
    map.getSource("accident-states")?.setData(visual==="states"&&result?stateFeatures(geo,result.rows,stateClass,stateMetric,state):EMPTY);map.triggerRepaint();
  },[ready,result,visual,geo,stateClass,stateMetric,state]);
  useEffect(()=>{if(ready&&mapRef.current)polishBasemap(mapRef.current,theme==="dark");},[ready,theme]);
  useEffect(()=>{if(ready&&data&&mapRef.current){if(state)fitState(mapRef.current,data,state);else mapRef.current.fitBounds(data.bounds,{padding:28,duration:450,maxZoom:5});}},[ready,state,data]);
  const fit=()=>{if(data&&result&&mapRef.current){if(visual==="states"){if(state)fitState(mapRef.current,data,state);else mapRef.current.fitBounds(data.bounds,{padding:28,duration:450,maxZoom:5});}else fitPoints(mapRef.current,data,result);}};
  const control="px-3 py-1.5 rounded-lg text-xs border border-border bg-surface text-slate-700 dark:text-slate-200 disabled:opacity-50";
  const toggle=(active:boolean)=>`px-3 py-2 rounded-lg text-xs font-semibold ${active?"bg-indigo-500 text-white":"text-slate-500 hover:bg-indigo-500/10"}`;
  const maxCount=Math.max(0,...rows.map(r=>stateValue(r,stateClass,stateMetric,totalStateCount)));
  return <div className="mt-4 space-y-3">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex flex-wrap gap-1 p-1 border border-border rounded-xl" role="group" aria-label="Тип карты">{VISUALS.map(m=><button key={m.id} type="button" aria-pressed={visual===m.id} onClick={()=>setVisual(m.id)} className={toggle(visual===m.id)}>{m.label}</button>)}</div>
      <div className="flex flex-wrap items-center gap-2"><select aria-label="Штат" value={state} onChange={e=>setState(e.target.value)} className={control}><option value="">Все штаты</option>{meta.states.filter((_,i)=>!data||data.stateCounts[i]>0).map(s=><option key={s} value={s}>{STATES[s]||s} ({s})</option>)}</select><button disabled={!ready||!result?.n} onClick={fit} className={control}>{stateMode?"К выбранной области":"К точкам"}</button><button disabled={!ready} onClick={()=>{setState("");mapRef.current?.fitBounds(data?.bounds??USA,{padding:28,duration:450,maxZoom:5});}} className={control}>США · общий вид</button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      {stateMode?<div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">Закраска штата:</span><div className="flex gap-1 p-1 border border-border rounded-xl">{([['share','Доля класса'],['count','Число аварий']] as const).map(([k,label])=><button key={k} className={toggle(stateMetric===k)} aria-pressed={stateMetric===k} onClick={()=>setStateMetric(k)}>{label}</button>)}</div><select aria-label="Класс для закраски" className={control} value={stateClass} onChange={e=>setStateClass(Number(e.target.value))}><option value={ALL_CLASSES}>Все классы</option>{desc.map((_,i)=><option key={i} value={i}>{cls(i)}</option>)}</select></div>:<div className="flex flex-wrap gap-1 p-1 border border-border rounded-xl" role="group" aria-label="Реальная тяжесть"><button className={toggle(severity==="")} aria-pressed={severity===""} onClick={()=>setSeverity("")}>Все классы</button>{COLORS.map((color,i)=><button key={i} className={toggle(severity===String(i))} aria-pressed={severity===String(i)} onClick={()=>setSeverity(String(i))}><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{background:color}}/>S{i+1}</button>)}</div>}
      <span className="text-xs text-slate-500">{stateMode?"В выбранной области":"На карте"}: <b>{fmt(result?.n??0)}</b> из {fmt(meta.valid)} аварий</span>
    </div>
    <div className="flex flex-wrap gap-2">{COLORS.map((color,i)=><div key={i} className="rounded-lg border border-border px-3 py-2 flex-1 min-w-[112px]"><div className="text-xs text-slate-500 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:color}}/>S{i+1} · {desc[i]}</div><div className="font-semibold text-sm mt-1">{fmt(result?.classes[i]??0)} <span className="text-xs font-normal text-slate-500">· {pct(result?.classes[i]??0,result?.n??0)}</span></div></div>)}</div>
    <div className="relative overflow-hidden rounded-xl border border-border bg-slate-100 dark:bg-slate-900" style={{isolation:"isolate"}}><div ref={host} aria-label="Интерактивная карта аварий США" style={{width:"100%",height:"clamp(420px, 62vh, 680px)"}}/>{(!ready||!data||error||mapError)&&<div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/90 p-5 text-center"><div className="max-w-sm text-sm text-slate-500">{error||mapError||"Загрузка географической карты США и точек…"}{(error||mapError)&&<button onClick={()=>setAttempt(v=>v+1)} className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-indigo-500 text-white">Повторить</button>}</div></div>}{ready&&result?.n===0&&<div className="absolute top-3 left-3 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-slate-500 pointer-events-none">Нет точек для выбранных фильтров</div>}</div>
    {tileError&&<p className="text-xs text-amber-600 dark:text-amber-400">Часть подложки не загрузилась. <button className="underline" onClick={()=>setAttempt(v=>v+1)}>Перезагрузить карту</button></p>}
    {stateMode&&geoStatus!=="ready"&&<p className="text-xs text-amber-600 dark:text-amber-400">{geoStatus==="error"?"Границы штатов недоступны. Показаны сводные круги в средних координатах аварий каждого штата.":"Загружаем границы штатов. Пока показаны сводные круги."}</p>}
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">{(visual==="points"||visual==="clusters")&&COLORS.map((color,i)=><span key={i} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:color}}/>S{i+1}</span>)}{visual==="clusters"&&<span>Цвет группы — преобладающий класс</span>}{visual==="heat"&&<span className="inline-flex items-center gap-2">Меньше <span className="w-28 h-2 rounded-full" style={{background:"linear-gradient(90deg,#2563eb,#06b6d4,#34d399,#fbbf24,#f43f5e)"}}/> Больше аварий</span>}{stateMode&&<span className="inline-flex items-center gap-2">0 <span className="w-28 h-2 rounded-full" style={{background:`linear-gradient(90deg,#f0f0f0,${stateClassColor(stateClass)})`}}/>{stateMetric==="share"?pct(maxCount,1):fmt(maxCount)} · {stateClass===ALL_CLASSES?"Все классы":`S${stateClass+1}`}</span>}{stateMode&&<span>{stateMetric==="share"&&(stateClass===ALL_CLASSES?"Доля штата от всех аварий США в тестовой выборке. ":"Доля класса от всех аварий штата. ")}Шкала от нуля до максимума среди штатов. Серый — нет данных. Нажмите на штат для состава классов.</span>}</div>
    <p className="text-[11px] text-slate-500">{VISUALS.find(m=>m.id===visual)?.note} Все аварии уже произошли. Классы отражают влияние на движение, а не тяжесть травм. Карта не прогнозирует аварии и не измеряет риск дорог. Весь тест с координатами, без ограничения точек. {meta.data_fraction!==undefined&&meta.data_fraction<1&&`Исходный прогон использовал ${pct(meta.data_fraction,1)} данных. `} {meta.total>meta.valid&&`Без отображаемых координат: ${fmt(meta.total-meta.valid)}. `}Подложка: OpenFreeMap / OpenStreetMap. {stateMode&&"Границы: PublicaMundi MappingAPI."}</p>
    {meta.version===1&&<p className="text-xs text-amber-600 dark:text-amber-400">Используется прежний файл точек. Для часа, температуры и видимости в карточках выполните обновлённый ноутбук.</p>}
    <div className="border border-border rounded-xl overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 p-4"><div><h3 className="text-sm font-semibold">Разбивка аварий по штатам</h3><p className="text-xs text-slate-500 mt-1">Все четыре класса, в количестве и долях от всех аварий штата. При выборе «Все классы» — доля штата от всех аварий США в тестовой выборке. Нажмите на название, чтобы приблизить его на карте.</p></div><div className="flex items-center gap-2"><select aria-label="Класс для сортировки по доле" className={control} value={stateClass} onChange={e=>setStateClass(Number(e.target.value))}><option value={ALL_CLASSES}>Все классы</option>{COLORS.map((_,i)=><option key={i} value={i}>Доля S{i+1}</option>)}</select>{state&&<button className={control} onClick={()=>setState("")}>Все штаты</button>}</div></div><div className="max-h-[420px] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-surface"><tr>{([['name','Штат'],['n','Всего'],['s0','S1'],['s1','S2'],['s2','S3'],['s3','S4'],['share',shareLabel]] as [SortKey,string][]).map(([k,label])=><th key={k} className="text-left p-3 whitespace-nowrap"><button onClick={()=>setSort(s=>({key:k,asc:s.key===k?!s.asc:k==='name'}))}>{label}{sort.key===k?(sort.asc?' ↑':' ↓'):''}</button></th>)}<th className="text-left p-3">Состав</th></tr></thead><tbody>{table.map(r=><tr key={r.key} className={`border-t border-border ${state===r.key?'bg-indigo-500/10':''}`}><td className="p-3"><button className="text-left font-medium hover:underline" onClick={()=>setState(state===r.key?'':r.key)}>{r.name} ({r.key})</button></td><td className="p-3 whitespace-nowrap">{fmt(r.n)}</td>{r.classes.map((n,i)=><td key={i} className="p-3 whitespace-nowrap"><span style={{color:COLORS[i]}}>{fmt(n)}</span><div className="text-slate-500">{pct(n,r.n)}</div></td>)}<td className="p-3">{pct(stateCount(r,stateClass),stateDenominator(r,stateClass,totalStateCount))}</td><td className="p-3"><div className="flex w-24 h-2 rounded overflow-hidden" title={r.classes.map((n,i)=>`S${i+1}: ${pct(n,r.n)}`).join(" · ")}>{r.classes.map((n,i)=><span key={i} style={{width:`${100*n/r.n}%`,background:COLORS[i]}}/>)}</div></td></tr>)}</tbody></table></div><div className="p-3 border-t border-border text-xs text-slate-500">Всего в таблице: <b>{fmt(table.reduce((a,r)=>a+r.n,0))}</b>. В таблице остаются все штаты; фильтр меток не меняет их доли.</div></div>
  </div>;
}
