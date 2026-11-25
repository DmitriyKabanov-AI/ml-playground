"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

export type MapData = { version: number; file: string; record_bytes: number; states: string[]; total: number; valid: number; balanced: number; balanced_per_class: number; accuracy: number; model: string };
const BASE = "/artifacts/classification/accident_severity/";
const CDN = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/";
const USA = [[-125,24],[-66,50]];
const STATES: Record<string,string> = { AL:"Алабама",AK:"Аляска",AZ:"Аризона",AR:"Арканзас",CA:"Калифорния",CO:"Колорадо",CT:"Коннектикут",DE:"Делавэр",DC:"Округ Колумбия",FL:"Флорида",GA:"Джорджия",HI:"Гавайи",ID:"Айдахо",IL:"Иллинойс",IN:"Индиана",IA:"Айова",KS:"Канзас",KY:"Кентукки",LA:"Луизиана",ME:"Мэн",MD:"Мэриленд",MA:"Массачусетс",MI:"Мичиган",MN:"Миннесота",MS:"Миссисипи",MO:"Миссури",MT:"Монтана",NE:"Небраска",NV:"Невада",NH:"Нью-Гэмпшир",NJ:"Нью-Джерси",NM:"Нью-Мексико",NY:"Нью-Йорк",NC:"Северная Каролина",ND:"Северная Дакота",OH:"Огайо",OK:"Оклахома",OR:"Орегон",PA:"Пенсильвания",RI:"Род-Айленд",SC:"Южная Каролина",SD:"Южная Дакота",TN:"Теннесси",TX:"Техас",UT:"Юта",VT:"Вермонт",VA:"Виргиния",WA:"Вашингтон",WV:"Западная Виргиния",WI:"Висконсин",WY:"Вайоминг" };
const desc = ["минимальная", "средняя (небольшое влияние)", "значительная", "тяжёлая (максимальное влияние)"];
const cls = (n:number) => `S${n+1} (${desc[n]})`;
const fmt = (n:number) => n.toLocaleString("ru-RU");
const pct = (n:number,d:number) => d ? (100*n/d).toLocaleString("ru-RU",{maximumFractionDigits:1,minimumFractionDigits:1})+"%" : "—";
const mercY = (lat:number) => (1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
type Mode = "all"|"wrong";
type Visual = "points"|"clusters"|"heat";
type Row = {key:string;name:string;n:number;right:number;wrong:number;shown:number;matrix:number[]};
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
  if(meta.version!==1||meta.record_bytes!==20||buffer.byteLength!==meta.total*20)throw new Error("Файл точек не соответствует отчёту. Пересоберите артефакты.");
  const view=new DataView(buffer),xy=new Float32Array(meta.total*2),valid=new Uint8Array(meta.total),stateCounts=new Uint32Array(meta.states.length);let n=0,b=0,west=180,east=-180,south=90,north=-90;
  for(let i=0;i<meta.total;i++){const o=i*20,x=view.getFloat64(o,true),y=view.getFloat64(o+8,true);if(view.getUint8(o+16)>=meta.states.length||view.getUint8(o+17)>3||view.getUint8(o+18)>3||view.getUint8(o+19)>1)throw new Error("Некорректные классы в файле карты");
    if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=85.05112878&&(x!==0||y!==0)){valid[i]=1;n++;stateCounts[view.getUint8(o+16)]++;west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);xy[i*2]=(x+180)/360;xy[i*2+1]=mercY(y);if(view.getUint8(o+19))b++;}}
  if(n!==meta.valid||b!==meta.balanced)throw new Error("Количество точек не совпадает с отчётом");return {view,xy,valid,stateCounts,bounds:n?[[Math.min(west,-125),Math.min(south,24)],[Math.max(east,-66),Math.max(north,50)]]:USA,meta};
}
function calculate(d:Data,balanced:boolean,state:string,severity:string,errorType:string,mode:Mode,collect=true){
  const groups=new Map<string,Row>(); const keys=d.meta.states;
  for(const key of keys)groups.set(key,{key,name:STATES[key]||key,n:0,right:0,wrong:0,shown:0,matrix:Array(16).fill(0)});
  const stateGroups=d.meta.states;
  const indices=new Uint32Array(collect?d.meta.total:0);const vertices=new Float32Array(collect?d.meta.total*3:0);let n=0,right=0,base=0,baseRight=0,scope=0,scopeRight=0;
  for(let i=0;i<d.meta.total;i++){if(!d.valid[i])continue;const o=i*20,v=d.view;if(balanced&&!v.getUint8(o+19))continue;const a=v.getUint8(o+17),p=v.getUint8(o+18),si=v.getUint8(o+16),s=d.meta.states[si],key=stateGroups[si],ok=a===p;
    base++;if(ok)baseRight++;
    if((state&&s!==state)||(severity!==""&&a!==Number(severity)))continue;
    const row=groups.get(key)!;row.n++;if(ok)row.right++;else row.wrong++;row.matrix[a*4+p]++;
    scope++;if(ok)scopeRight++;
    if((errorType==="under"&&p>=a)||(errorType==="over"&&p<=a)||(mode==="wrong"&&ok))continue;
    row.shown++;if(collect){indices[n]=i;vertices[n*3]=d.xy[i*2];vertices[n*3+1]=d.xy[i*2+1];vertices[n*3+2]=ok?0:(p<a?2:1);}n++;if(ok)right++;
  }
  return {rows:[...groups.values()],indices:indices.subarray(0,n),vertices:vertices.subarray(0,n*3),n,right,base,baseRight,scope,scopeRight};
}
function frequent(row:Row){let best=0,idx=-1;row.matrix.forEach((v,i)=>{if(Math.floor(i/4)!==i%4&&v>best){best=v;idx=i;}});return idx<0?"Нет ошибок":`${cls(Math.floor(idx/4))} принимается за ${cls(idx%4)} (${fmt(best)})`;}
function popupText(text:string){const node=document.createElement("div");node.style.cssText="font:13px/1.5 system-ui;color:#17223b;white-space:pre-line;max-width:250px";node.textContent=text;return node;}
function makePainter(canvas:HTMLCanvasElement){
  const context=canvas.getContext("webgl",{alpha:true,antialias:false,premultipliedAlpha:false});if(!context)throw new Error("WebGL недоступен: включите аппаратное ускорение браузера.");const gl:WebGLRenderingContext=context;
  const shader=(kind:number,src:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Ошибка WebGL");return s;};
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 a; uniform vec2 origin; uniform vec2 scale; uniform float size; varying float kind; void main(){gl_Position=vec4(origin+a.xy*scale,0.,1.);kind=a.z;gl_PointSize=size*(kind>1.5?1.3:1.);}`);
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float; varying float kind; void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;vec3 c=kind<.5?vec3(.02,.63,.32):vec3(.96,.59,.08);if(kind>1.5)c=r>.37?vec3(.65,.06,.13):vec3(.96,.15,.25);else if(r>.40)c=vec3(.96,.98,1.);gl_FragColor=vec4(c,.88);}`);
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
  {id:"points",label:"Метки",note:"Одна метка — одна авария. Нажмите на неё, чтобы увидеть ответ модели."},
  {id:"clusters",label:"Кластеры",note:"Число в круге — количество аварий поблизости. Нажмите на круг, чтобы приблизить карту."},
  {id:"heat",label:"Тепловая карта",note:"Цвет показывает концентрацию выбранных аварий, а не риск и не долю ошибок."},
];
const EMPTY={type:"FeatureCollection",features:[]};
const CLUSTER="accident-clusters",COUNT="accident-count", SINGLE="accident-single",HEAT="accident-heat";
const inverseY=(y:number)=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;
type Result=ReturnType<typeof calculate>;
type Bin={x:number;y:number;n:number;right:number;under:number;over:number;index:number};
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
    let g=groups.get(key);if(!g){g={x:0,y:0,n:0,right:0,under:0,over:0,index:result.indices[i]};groups.set(key,g);}
    g.x+=x;g.y+=y;g.n++;if(kind===0)g.right++;else if(kind===2)g.under++;else g.over++;
  }
  return {type:"FeatureCollection",features:Array.from(groups.values(),g=>({type:"Feature",geometry:{type:"Point",coordinates:[g.x/g.n*360-180,inverseY(g.y/g.n)]},properties:{count:g.n,right:g.right,under:g.under,over:g.over,index:g.index,color:g.right?"#10b981":g.under?"#f43f5e":"#f59e0b"}}))};
}
function addVisualLayers(map:any){
  const font=map.getStyle().layers?.find((l:any)=>l.type==="symbol"&&Array.isArray(l.layout?.["text-font"])&&l.layout["text-font"].every((v:unknown)=>typeof v==="string"))?.layout?.["text-font"];
  map.addSource("accident-bins",{type:"geojson",data:EMPTY});
  map.addLayer({id:HEAT,type:"heatmap",source:"accident-bins",layout:{visibility:"none"},paint:{
    "heatmap-weight":["get","count"],"heatmap-intensity":["interpolate",["linear"],["zoom"],2,0.015,5,0.08,9,0.3,14,1],
    "heatmap-radius":["interpolate",["linear"],["zoom"],2,16,7,30,15,46],
    "heatmap-color":["interpolate",["linear"],["heatmap-density"],0,"rgba(37,99,235,0)",0.15,"#2563eb",0.35,"#06b6d4",0.55,"#34d399",0.75,"#fbbf24",1,"#f43f5e"],"heatmap-opacity":0.85}});
  map.addLayer({id:SINGLE,type:"circle",source:"accident-bins",filter:["==",["get","count"],1],layout:{visibility:"none"},paint:{"circle-color":["get","color"],"circle-radius":["interpolate",["linear"],["zoom"],2,3,5,4,10,6,15,9],"circle-opacity":0.9,"circle-stroke-width":0.8,"circle-stroke-color":"#fff"}});
  map.addLayer({id:CLUSTER,type:"circle",source:"accident-bins",filter:[">",["get","count"],1],layout:{visibility:"none"},paint:{"circle-color":["step",["get","count"],"#6366f1",30,"#4f46e5",100,"#3730a3"],"circle-radius":["step",["get","count"],15,30,21,100,28,1000,33,10000,39],"circle-opacity":0.92,"circle-stroke-width":1.5,"circle-stroke-color":"#a5b4fc"}});
  map.addLayer({id:COUNT,type:"symbol",source:"accident-bins",filter:[">",["get","count"],1],layout:{visibility:"none","text-field":["to-string",["get","count"]],"text-font":font??["Noto Sans Regular"],"text-size":12,"text-allow-overlap":true,"text-ignore-placement":true},paint:{"text-color":"#fff"}});
}
function layerMode(map:any,visual:Visual){for(const id of [CLUSTER,COUNT,SINGLE,HEAT])map.setLayoutProperty(id,"visibility",(visual==="clusters"&&id!==HEAT)||(visual==="heat"&&id===HEAT)?"visible":"none");}
function pointInfo(d:Data,index:number){const o=index*20,v=d.view,a=v.getUint8(o+17),p=v.getUint8(o+18),diff=Math.abs(a-p),s=d.meta.states[v.getUint8(o+16)];return {coord:[v.getFloat64(o,true),v.getFloat64(o+8,true)],text:`Штат: ${STATES[s]||s} (${s})\nРеальная тяжесть: ${cls(a)}\nМодель сказала: ${cls(p)}\n${diff?`Модель ${p<a?"занизила":"завысила"} тяжесть на ${["","один уровень","два уровня","три уровня"][diff]}.`:"Модель угадала тяжесть."}\nКоординаты: ${v.getFloat64(o+8,true).toFixed(5)}, ${v.getFloat64(o,true).toFixed(5)}`};}
function pointPopup(d:Data,r:Result,index:number){
  const root=popupText("");const detail=popupText("");root.append(detail);
  const x=d.view.getFloat64(index*20,true),y=d.view.getFloat64(index*20+8,true);
  const same:number[]=[];for(const i of r.indices){if(d.view.getFloat64(i*20,true)===x&&d.view.getFloat64(i*20+8,true)===y)same.push(i);}
  let at=Math.max(0,same.indexOf(index));const render=()=>{detail.textContent=pointInfo(d,same[at]??index).text;};render();
  if(same.length>1){const nav=document.createElement("div");nav.style.cssText="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;";const prev=document.createElement("button"),next=document.createElement("button"),label=document.createElement("span");prev.textContent="‹";next.textContent="›";prev.setAttribute("aria-label","Предыдущая авария");next.setAttribute("aria-label","Следующая авария");for(const b of [prev,next])b.style.cssText="border:1px solid #cbd5e1;border-radius:5px;padding:2px 10px;";const update=()=>{label.textContent=`${at+1} из ${same.length}`;prev.disabled=at===0;next.disabled=at===same.length-1;render();};prev.onclick=()=>{at=Math.max(0,at-1);update();};next.onclick=()=>{at=Math.min(same.length-1,at+1);update();};nav.append(prev,label,next);root.append(nav);update();}
  return root;
}
function nearest(map:any,result:Result,point:{x:number;y:number}){const p=map.project([0,0]),p1=map.project([1,0]),world=(p1.x-p.x)*360;const x=(point.x-p.x)/world+.5,y=(point.y-p.y)/world+.5;let best=100/(world*world),index=-1;for(let i=0;i<result.n;i++){const dx=result.vertices[i*3]-x,dy=result.vertices[i*3+1]-y,dd=dx*dx+dy*dy;if(dd<=best){best=dd;index=result.indices[i];}}return index;}
function fitPoints(map:any,d:Data,r:Result){if(!r.n)return;let west=180,east=-180,south=90,north=-90;for(const i of r.indices){const x=d.view.getFloat64(i*20,true),y=d.view.getFloat64(i*20+8,true);west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}map.fitBounds(east-west>180?USA:[[west,south],[east,north]],{padding:42,duration:450,maxZoom:11});}

function fitState(map:any,d:Data,state:string){const si=d.meta.states.indexOf(state);let west=180,east=-180,south=90,north=-90;for(let i=0;i<d.meta.total;i++){if(!d.valid[i]||d.view.getUint8(i*20+16)!==si)continue;const x=d.view.getFloat64(i*20,true),y=d.view.getFloat64(i*20+8,true);west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);}if(west<=east)map.fitBounds([[west,south],[east,north]],{padding:42,duration:450,maxZoom:9});}

export default function AccidentGeoMap({meta}:{meta:MapData}){
  const theme=useAppStore(s=>s.theme);
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[mapError,setMapError]=useState(""),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0),[tileError,setTileError]=useState(false);
  const [balanced,setBalanced]=useState(false),[mode,setMode]=useState<Mode>("all"),[visual,setVisual]=useState<Visual>("points"),[state,setState]=useState(""),[severity,setSeverity]=useState(""),[errorType,setErrorType]=useState("");
  const [sort,setSort]=useState<{key:"name"|"n"|"right"|"wrong"|"shown";asc:boolean}>({key:"n",asc:false});
  const host=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),popup=useRef<any>(null),canvasRef=useRef<HTMLCanvasElement|null>(null),painter=useRef<ReturnType<typeof makePainter>|null>(null);
  useEffect(()=>{const controller=new AbortController();setData(null);setError("");fetch(BASE+encodeURIComponent(meta.file),{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Не найден файл точек. Выполните обновлённый ноутбук.");return r.arrayBuffer();}).then(b=>{if(!controller.signal.aborted)setData(decode(b,meta));}).catch(e=>{if(!controller.signal.aborted)setError(String(e.message||e));});return()=>controller.abort();},[meta,attempt]);
  const result=useMemo(()=>data?calculate(data,balanced,state,severity,errorType,mode):null,[data,balanced,state,severity,errorType,mode]);
  // Keep all state rows in the table when one state is selected, for convenient navigation.
  const overview=useMemo(()=>data?calculate(data,balanced,"",severity,"","all",false):null,[data,balanced,severity]);
  const table=useMemo(()=>{const shown=new Map(result?.rows.map(r=>[r.key,r.shown])||[]);return (overview?.rows||[]).map(r=>({...r,shown:shown.get(r.key)||0})).filter(r=>r.n>0).sort((a,b)=>{const k=sort.key;const f=k==="name"?a.name.localeCompare(b.name,"ru"):k==="n"||k==="shown"?a[k]-b[k]:a[k]/a.n-b[k]/b.n;return sort.asc?f:-f;});},[overview,result,sort]);
  const latest=useRef({data,result,visual,theme});latest.current={data,result,visual,theme};
  useEffect(()=>{let dead=false,loaded=false;let observer:ResizeObserver|undefined;let timer:number|undefined;let map:any;let lib:any;setReady(false);setMapError("");setTileError(false);
    const refresh=()=>{const {visual:v,result:r}=latest.current;if(!loaded||!r||!map)return;if(v!=="points")map.getSource("accident-bins")?.setData(binsForView(r,map,v));};
    void loadLibrary().then(l=>{if(dead||!host.current)return;lib=l;map=new lib.Map({container:host.current,style:"https://tiles.openfreemap.org/styles/liberty",center:[-96,38],zoom:3,minZoom:1,maxZoom:15,maxPitch:0,pitchWithRotate:false,dragRotate:false,touchPitch:false,renderWorldCopies:false,attributionControl:true});mapRef.current=map;map.touchZoomRotate?.disableRotation();map.keyboard?.disableRotation();map.addControl(new lib.NavigationControl({showCompass:false}),"top-right");map.addControl(new lib.ScaleControl({maxWidth:110,unit:"metric"}),"bottom-left");
      timer=window.setTimeout(()=>{if(!dead&&!loaded)setMapError("Географическая подложка не загрузилась. Проверьте доступ к OpenFreeMap.");},25000);
      map.on("load",()=>{if(dead)return;try{clearTimeout(timer);polishBasemap(map,latest.current.theme==="dark");addVisualLayers(map);const canvas=document.createElement("canvas");canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";host.current!.insertBefore(canvas,map.getCanvasContainer().nextSibling);canvasRef.current=canvas;painter.current=makePainter(canvas);canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();setMapError("Потерян графический контекст. Нажмите «Повторить».");});map.on("render",()=>{if(latest.current.visual==="points")painter.current?.draw(map);});map.fitBounds(USA,{padding:28,duration:0,maxZoom:5});loaded=true;setReady(true);setMapError("");}catch(e){setMapError(String(e));}});
      map.on("moveend",refresh);map.on("resize",refresh);map.on("error",(e:any)=>{if(!dead&&loaded&&e.error)setTileError(true);});
      map.on("click",(e:any)=>{if(!loaded)return;const {data:d,result:r,visual:v}=latest.current;if(!d||!r||v==="heat")return;let index=-1;popup.current?.remove();popup.current=null;
        if(v==="clusters"){const f=map.queryRenderedFeatures(e.point,{layers:[CLUSTER,COUNT,SINGLE]})[0];if(!f)return;const props=f.properties;if(Number(props.count)>1){if(map.getZoom()<15){map.easeTo({center:f.geometry.coordinates,zoom:Math.min(15,map.getZoom()+2),duration:450});return;}popup.current=new lib.Popup({maxWidth:"300px"}).setLngLat(f.geometry.coordinates).setDOMContent(popupText(`Аварий в этой группе: ${fmt(Number(props.count))}\nВерно: ${fmt(Number(props.right))}\nЗанижено: ${fmt(Number(props.under))}\nЗавышено: ${fmt(Number(props.over))}\nДля отдельных аварий выберите режим «Метки».`)).addTo(map);return;}index=Number(props.index);}else index=nearest(map,r,e.point);
        if(index<0)return;const info=pointInfo(d,index);popup.current=new lib.Popup({maxWidth:"300px",offset:12}).setLngLat(info.coord).setDOMContent(pointPopup(d,r,index)).addTo(map);
      });observer=new ResizeObserver(()=>map.resize());observer.observe(host.current);
    }).catch(e=>{if(!dead)setMapError(String(e.message||e));});
    return()=>{dead=true;clearTimeout(timer);observer?.disconnect();popup.current?.remove();popup.current=null;painter.current?.dispose();painter.current=null;canvasRef.current?.remove();canvasRef.current=null;map?.remove();mapRef.current=null;};
  },[attempt]);
  useEffect(()=>{if(!ready||!mapRef.current)return;const map=mapRef.current;popup.current?.remove();popup.current=null;layerMode(map,visual);if(canvasRef.current)canvasRef.current.style.display=visual==="points"?"block":"none";if(visual==="points"){map.getSource("accident-bins")?.setData(EMPTY);painter.current?.set(result?.vertices??new Float32Array());}else{painter.current?.set(new Float32Array());map.getSource("accident-bins")?.setData(result?binsForView(result,map,visual):EMPTY);}map.triggerRepaint();},[ready,result,visual]);
  useEffect(()=>{if(ready&&mapRef.current)polishBasemap(mapRef.current,theme==="dark");},[ready,theme]);
  useEffect(()=>{if(ready&&data&&result&&mapRef.current){if(state)fitState(mapRef.current,data,state);else mapRef.current.fitBounds(USA,{padding:28,duration:450,maxZoom:5});}},[ready,state,data]); // only state selection changes the viewport
  const fit=()=>{if(data&&result&&mapRef.current)fitPoints(mapRef.current,data,result);};
  const control="px-3 py-1.5 rounded-lg text-xs border border-border bg-surface text-slate-700 dark:text-slate-200 disabled:opacity-50";
  const toggle=(active:boolean)=>`px-3 py-2 rounded-lg text-xs font-semibold ${active?"bg-indigo-500 text-white":"text-slate-500 hover:bg-indigo-500/10"}`;
  return <div className="mt-4 space-y-3">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex flex-wrap gap-1 p-1 border border-border rounded-xl" role="group" aria-label="Тип карты">{VISUALS.map(m=><button key={m.id} type="button" aria-pressed={visual===m.id} onClick={()=>setVisual(m.id)} className={toggle(visual===m.id)}>{m.label}</button>)}</div>
      <div className="flex flex-wrap gap-1 p-1 border border-border rounded-xl" role="group" aria-label="Отображаемые аварии"><button className={toggle(mode==="all")} aria-pressed={mode==="all"} onClick={()=>{setMode("all");setErrorType("");}}>Все</button><button className={toggle(mode==="wrong")} aria-pressed={mode==="wrong"} onClick={()=>setMode("wrong")}>Только ошибочные</button></div>
    </div>
    <div className="flex items-center justify-between flex-wrap gap-2"><div className="flex flex-wrap gap-1 p-1 border border-border rounded-xl" role="group" aria-label="Выборка"><button className={toggle(!balanced)} aria-pressed={!balanced} onClick={()=>setBalanced(false)}>Реальные пропорции</button><button className={toggle(balanced)} aria-pressed={balanced} onClick={()=>setBalanced(true)}>Поровну по классам</button></div>
    <div className="flex flex-wrap items-center gap-2"><select aria-label="Штат" value={state} onChange={e=>setState(e.target.value)} className={control}><option value="">Все штаты</option>{meta.states.filter((_,i)=>!data||data.stateCounts[i]>0).map(s=><option key={s} value={s}>{STATES[s]||s} ({s})</option>)}</select><select aria-label="Реальная тяжесть" value={severity} onChange={e=>setSeverity(e.target.value)} className={control}><option value="">Все классы</option>{desc.map((_,i)=><option key={i} value={i}>{cls(i)}</option>)}</select><select aria-label="Тип ошибки" value={errorType} onChange={e=>{setErrorType(e.target.value);if(e.target.value)setMode("wrong");}} className={control}><option value="">Любой ответ</option><option value="under">Занижена тяжесть</option><option value="over">Завышена тяжесть</option></select><button disabled={!ready||!result?.n} onClick={fit} className={control}>К точкам</button><button disabled={!ready} onClick={()=>{setState("");mapRef.current?.fitBounds(USA,{padding:28,duration:450,maxZoom:5});}} className={control}>США · общий вид</button></div></div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500"><span>{balanced?"Поровну по классам":"Весь тест с координатами"}: <b>{fmt(result?.base??(balanced?meta.balanced:meta.valid))}</b></span>{result&&<><span>Верных в выборке: <b>{pct(result.baseRight,result.base)}</b></span><span>На карте: <b>{fmt(result.n)}</b> · {pct(result.n,result.base)} выборки</span></>}<span>На всём тесте: {pct(meta.accuracy,1)} верных</span></div>
    <div className="relative overflow-hidden rounded-xl border border-border bg-slate-100 dark:bg-slate-900" style={{isolation:"isolate"}}><div ref={host} aria-label="Интерактивная карта аварий США" style={{width:"100%",height:"clamp(420px, 62vh, 680px)"}}/>{(!ready||!data||error||mapError)&&<div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/90 p-5 text-center"><div className="max-w-sm text-sm text-slate-500">{error||mapError||"Загрузка географической карты США и точек…"}{(error||mapError)&&<button onClick={()=>setAttempt(v=>v+1)} className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-indigo-500 text-white">Повторить</button>}</div></div>}{ready&&result?.n===0&&<div className="absolute top-3 left-3 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-slate-500 pointer-events-none">Нет точек для выбранных фильтров</div>}</div>
    {tileError&&<p className="text-xs text-amber-600 dark:text-amber-400">Часть подложки не загрузилась. <button className="underline" onClick={()=>setAttempt(v=>v+1)}>Перезагрузить карту</button></p>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><div className="flex flex-wrap items-center gap-3">{visual!=="heat"&&[["#10b981","Верно"],["#f43f5e","Занижена тяжесть"],["#f59e0b","Завышена тяжесть"]].map(([color,label])=><span key={label} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:color}}/>{label}</span>)}{visual==="clusters"&&<span>Индиго — группа аварий</span>}{visual==="heat"&&<span className="inline-flex items-center gap-2">Меньше <span className="w-28 h-2 rounded-full" style={{background:"linear-gradient(90deg,#2563eb,#06b6d4,#34d399,#fbbf24,#f43f5e)"}}/> Больше</span>}</div><span>{result?`На карте: ${fmt(result.n)} аварий`:""}</span></div>
    <p className="text-[11px] text-slate-500">{VISUALS.find(m=>m.id===visual)?.note} Все аварии уже произошли. Карта не прогнозирует аварии и не показывает опасность дорог. Доля верных в выборке не заменяет оценку на полном тесте. Подложка: OpenFreeMap / OpenStreetMap. {meta.total>meta.valid&&`Без отображаемых координат: ${fmt(meta.total-meta.valid)}.`}</p>
    <div className="border border-border rounded-xl overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-2 p-4"><div><h3 className="text-sm font-semibold">Разбивка по штатам</h3><p className="text-xs text-slate-500 mt-1">Доли ошибок среди всех аварий выбранной выборки и класса. Нажмите на штат, чтобы оставить его точки.</p></div>{state&&<button className={control} onClick={()=>setState("")}>Все штаты</button>}</div><div className="max-h-[420px] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-surface"><tr>{([['name','Штат'],['n','Аварий'],['right','Верных, %'],['wrong','Ошибок, %'],['shown','На карте']] as const).map(([k,label])=><th key={k} className="text-left p-3"><button onClick={()=>setSort(s=>({key:k,asc:s.key===k?!s.asc:k==='name'}))}>{label}{sort.key===k?(sort.asc?' ↑':' ↓'):''}</button></th>)}</tr></thead><tbody>{table.map(r=><tr key={r.key} className={`border-t border-border ${state===r.key?'bg-indigo-500/10':''}`}><td className="p-3"><button className="text-left font-medium hover:underline" onClick={()=>setState(state===r.key?'':r.key)}>{r.name} ({r.key})</button>{r.n<30&&<div className="text-slate-500">мало данных</div>}</td><td className="p-3">{fmt(r.n)}</td><td className="p-3 text-emerald-500">{pct(r.right,r.n)}</td><td className="p-3" title={frequent(r)}><div className="flex items-center gap-2"><div className="w-16 h-1.5 rounded bg-slate-400/20 overflow-hidden"><div className="h-full bg-rose-500" style={{width:`${100*r.wrong/r.n}%`}}/></div>{pct(r.wrong,r.n)}</div></td><td className="p-3">{fmt(r.shown)}</td></tr>)}</tbody></table></div><div className="p-3 border-t border-border text-xs text-slate-500">Показано на карте по всем строкам: <b>{fmt(result?.n??0)}</b>. Проценты не зависят от переключателя «Только ошибочные».</div></div>
  </div>;
}
