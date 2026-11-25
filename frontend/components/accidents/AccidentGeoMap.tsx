"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";

export type MapData = { version: number; file: string; record_bytes: number; states: string[]; total: number; valid: number; balanced: number; balanced_per_class: number; accuracy: number; model: string };
const BASE = "/artifacts/classification/accident_severity/";
const CDN = "https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/";
const GEO = "https://cdn.jsdelivr.net/gh/PublicaMundi/MappingAPI@master/data/geojson/us-states.json";
const USA = [[-125,24],[-66,50]];
const REGIONS: Record<string,string[]> = {
  "Северо-восток": "CT ME MA NH RI VT NJ NY PA".split(" "),
  "Средний Запад": "IN IL MI OH WI IA KS MN MO NE ND SD".split(" "),
  "Юг": "DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA OK TX".split(" "),
  "Запад": "AZ CO ID MT NV NM UT WY AK CA HI OR WA".split(" "),
};
const STATES: Record<string,string> = { AL:"Алабама",AK:"Аляска",AZ:"Аризона",AR:"Арканзас",CA:"Калифорния",CO:"Колорадо",CT:"Коннектикут",DE:"Делавэр",DC:"Округ Колумбия",FL:"Флорида",GA:"Джорджия",HI:"Гавайи",ID:"Айдахо",IL:"Иллинойс",IN:"Индиана",IA:"Айова",KS:"Канзас",KY:"Кентукки",LA:"Луизиана",ME:"Мэн",MD:"Мэриленд",MA:"Массачусетс",MI:"Мичиган",MN:"Миннесота",MS:"Миссисипи",MO:"Миссури",MT:"Монтана",NE:"Небраска",NV:"Невада",NH:"Нью-Гэмпшир",NJ:"Нью-Джерси",NM:"Нью-Мексико",NY:"Нью-Йорк",NC:"Северная Каролина",ND:"Северная Дакота",OH:"Огайо",OK:"Оклахома",OR:"Орегон",PA:"Пенсильвания",RI:"Род-Айленд",SC:"Южная Каролина",SD:"Южная Дакота",TN:"Теннесси",TX:"Техас",UT:"Юта",VT:"Вермонт",VA:"Виргиния",WA:"Вашингтон",WV:"Западная Виргиния",WI:"Висконсин",WY:"Вайоминг" };
const EN: Record<string,string> = Object.fromEntries("Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|District of Columbia|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming".split("|").map((s,i)=>[s,Object.keys(STATES)[i]]));
const regionOf = (s:string) => Object.keys(REGIONS).find(r=>REGIONS[r].includes(s)) || "Прочие";
const desc = ["минимальная", "средняя (небольшое влияние)", "значительная", "тяжёлая (максимальное влияние)"];
const cls = (n:number) => `S${n+1} (${desc[n]})`;
const fmt = (n:number) => n.toLocaleString("ru-RU");
const pct = (n:number,d:number) => d ? (100*n/d).toLocaleString("ru-RU",{maximumFractionDigits:1,minimumFractionDigits:1})+"%" : "—";
const mercY = (lat:number) => (1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2;
type Mode = "all"|"right"|"wrong";
type Level = "state"|"region";
type Row = {key:string;name:string;n:number;right:number;wrong:number;shown:number;matrix:number[]};
type Data = {view:DataView; xy:Float32Array; valid:Uint8Array; stateCounts:Uint32Array; bounds:number[][]; meta:MapData};
type GeoFeature = {type:string;geometry:{type:string;coordinates:unknown};properties:Record<string,unknown>};
type Geo = {type:"FeatureCollection";features:GeoFeature[]};
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
function calculate(d:Data,balanced:boolean,level:Level,state:string,severity:string,errorType:string,mode:Mode,selected:string){
  const groups=new Map<string,Row>(); const keys=level==="state"?d.meta.states:Object.keys(REGIONS).concat(d.meta.states.some(s=>regionOf(s)==="Прочие")?["Прочие"]:[]);
  for(const key of keys)groups.set(key,{key,name:level==="state"?STATES[key]||key:key,n:0,right:0,wrong:0,shown:0,matrix:Array(16).fill(0)});
  const stateGroups=d.meta.states.map(s=>level==="state"?s:regionOf(s));
  const indices=new Uint32Array(d.meta.total);const vertices=new Float32Array(d.meta.total*3);let n=0,right=0,base=0,baseRight=0,scope=0,scopeRight=0;
  for(let i=0;i<d.meta.total;i++){if(!d.valid[i])continue;const o=i*20,v=d.view;if(balanced&&!v.getUint8(o+19))continue;const a=v.getUint8(o+17),p=v.getUint8(o+18),si=v.getUint8(o+16),s=d.meta.states[si],key=stateGroups[si],ok=a===p;
    base++;if(ok)baseRight++;
    if((state&&s!==state)||(severity!==""&&a!==Number(severity)))continue;
    const row=groups.get(key)!;row.n++;if(ok)row.right++;else row.wrong++;row.matrix[a*4+p]++;
    if(selected&&key!==selected)continue;scope++;if(ok)scopeRight++;
    if((errorType==="under"&&p>=a)||(errorType==="over"&&p<=a)||(mode==="right"&&!ok)||(mode==="wrong"&&ok))continue;
    row.shown++;indices[n]=i;vertices[n*3]=d.xy[i*2];vertices[n*3+1]=d.xy[i*2+1];vertices[n*3+2]=ok?0:(a>=2&&p<a?2:1);n++;if(ok)right++;
  }
  return {rows:[...groups.values()],indices:indices.subarray(0,n),vertices:vertices.subarray(0,n*3),n,right,base,baseRight,scope,scopeRight};
}
function frequent(row:Row){let best=0,idx=-1;row.matrix.forEach((v,i)=>{if(Math.floor(i/4)!==i%4&&v>best){best=v;idx=i;}});return idx<0?"Нет ошибок":`${cls(Math.floor(idx/4))} принимается за ${cls(idx%4)} (${fmt(best)})`;}
function fillColor(r:Row|undefined){if(!r||r.n<30)return "#9ca3af";const t=r.wrong/r.n;return `rgb(${Math.round(255-102*t)},${Math.round(239-212*t)},${Math.round(218-191*t)})`;}
function popupText(text:string){const node=document.createElement("div");node.style.cssText="font:13px/1.5 system-ui;color:#17223b;white-space:pre-line;max-width:250px";node.textContent=text;return node;}
function polishBasemap(map: any, dark: boolean) {
  const p = dark ? { land: "#121c2c", water: "#0b1424", park: "#172d32", road: "#39465a", boundary: "#64748b", label: "#bac9df", building: "#202d3f" }
    : { land: "#f1f5fb", water: "#dceaf8", park: "#e1efec", road: "#c6d2e2", boundary: "#8799b1", label: "#53647b", building: "#e3eaf4" };
  for (const layer of map.getStyle().layers ?? []) {
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

function makePainter(canvas:HTMLCanvasElement){
  const context=canvas.getContext("webgl",{alpha:true,antialias:false,premultipliedAlpha:false});if(!context)throw new Error("WebGL недоступен: включите аппаратное ускорение браузера.");const gl:WebGLRenderingContext=context;
  const shader=(kind:number,src:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Ошибка WebGL");return s;};
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 a; uniform vec2 origin; uniform vec2 scale; uniform float size; varying float kind; void main(){gl_Position=vec4(origin+a.xy*scale,0.,1.);kind=a.z;gl_PointSize=size*(kind>1.5?1.5:1.);}`);
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float; varying float kind; void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;vec3 c=kind<.5?vec3(.063,.725,.506):vec3(.957,.247,.369);if(kind>1.5)c=r>.33?vec3(.40,.04,.12):vec3(1.,.23,.31);float edge=1.-smoothstep(.39,.50,r);gl_FragColor=vec4(c,edge*.90);}`);
  const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Ошибка программы WebGL");gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  const buf=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buf);const a=gl.getAttribLocation(program,"a");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);
  const origin=gl.getUniformLocation(program,"origin"),scale=gl.getUniformLocation(program,"scale"),size=gl.getUniformLocation(program,"size");let count=0;
  return {set(v:Float32Array){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);count=v.length/3;},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draw(map:any){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);const p=map.project([0,0]),p1=map.project([1,0]),world=(p1.x-p.x)*360;gl.useProgram(program);gl.uniform2f(origin,2*(p.x-world/2)/w-1,1-2*(p.y-world/2)/h);gl.uniform2f(scale,2*world/w,-2*world/h);gl.uniform1f(size,(map.getZoom()<4?2.0:map.getZoom()<6?2.6:map.getZoom()<9?4:map.getZoom()<12?6:8)*dpr);gl.drawArrays(gl.POINTS,0,count);},
    dispose(){gl.deleteBuffer(buf);gl.deleteProgram(program);}};
}
export default function AccidentGeoMap({meta}:{meta:MapData}){
  const theme=useAppStore(s=>s.theme);const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[mapError,setMapError]=useState(""),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
  const [balanced,setBalanced]=useState(false),[mode,setMode]=useState<Mode>("wrong"),[level,setLevel]=useState<Level>("state"),[state,setState]=useState(""),[severity,setSeverity]=useState(""),[errorType,setErrorType]=useState(""),[selected,setSelected]=useState("");
  const [shade,setShade]=useState(true);
  const [sort,setSort]=useState<{key:"name"|"n"|"right"|"wrong"|"shown";asc:boolean}>({key:"wrong",asc:false});
  const host=useRef<HTMLDivElement>(null);
  // External MapLibre object is kept behind a local adapter; no package dependency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef=useRef<any>(null),popup=useRef<any>(null);const painter=useRef<ReturnType<typeof makePainter>|null>(null),geo=useRef<Geo|null>(null);
  useEffect(()=>{const controller=new AbortController();setData(null);setError("");fetch(BASE+encodeURIComponent(meta.file),{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Не найден файл точек. Запустите обновлённый ноутбук.");return r.arrayBuffer();}).then(b=>{if(!controller.signal.aborted)setData(decode(b,meta));}).catch(e=>{if(!controller.signal.aborted)setError(String(e.message||e));});return()=>controller.abort();},[meta,attempt]);
  const result=useMemo(()=>data?calculate(data,balanced,level,state,severity,errorType,mode,selected):null,[data,balanced,level,state,severity,errorType,mode,selected]);
  const latest=useRef({data,result,level,selected,theme,shade});latest.current={data,result,level,selected,theme,shade};
  const table=useMemo(()=>[...(result?.rows||[])].sort((a,b)=>{const k=sort.key;const f=k==="name"?a.name.localeCompare(b.name,"ru"):k==="n"||k==="shown"?a[k]-b[k]:((a.n?a[k]/a.n:-1)-(b.n?b[k]/b.n:-1));return sort.asc?f:-f;}),[result,sort]);
  const choose=(key:string)=>{setSelected(key);setState(prev=>prev&&(latest.current.level==="state"?prev:regionOf(prev))!==key?"":prev);};
  useEffect(()=>{let dead=false;let observer:ResizeObserver|undefined;let canvas:HTMLCanvasElement|undefined;let timer:number|undefined;const abort=new AbortController();setReady(false);setMapError("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map:any;let hover:any;let lib:any;
    const show=(text:string,coord:[number,number],permanent=false)=>{if(permanent){popup.current?.remove();popup.current=new lib.Popup({closeButton:true,maxWidth:"300px",className:"accident-popup"}).setLngLat(coord).setDOMContent(popupText(text)).addTo(map);popup.current.getElement().style.zIndex="3";}else{hover?.remove();hover=new lib.Popup({closeButton:false,closeOnClick:false,offset:10,maxWidth:"300px",className:"accident-popup"}).setLngLat(coord).setDOMContent(popupText(text)).addTo(map);hover.getElement().style.pointerEvents="none";hover.getElement().style.zIndex="3";const content=hover.getElement().querySelector(".maplibregl-popup-content");if(content)content.style.pointerEvents="none";}};
    Promise.all([loadLibrary(),fetch(GEO,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error("Не загрузились границы штатов");return r.json();})]).then(([l,g])=>{
      if(dead||!host.current)return;lib=l;geo.current={type:"FeatureCollection",features:(g as Geo).features.filter(f=>EN[String(f.properties.name)]).map(f=>({...f,properties:{code:EN[String(f.properties.name)],color:"#9ca3af",selected:false}}))};if(geo.current.features.length<48)throw new Error("Не удалось получить границы штатов США");
      map=new lib.Map({container:host.current,style:"https://tiles.openfreemap.org/styles/liberty",center:[-96,38],zoom:3,minZoom:1,maxZoom:15,bearing:0,maxPitch:0,pitchWithRotate:false,dragRotate:false,touchPitch:false,renderWorldCopies:false});mapRef.current=map;map.touchZoomRotate?.disableRotation();map.addControl(new lib.NavigationControl({showCompass:false}),"top-right");map.addControl(new lib.ScaleControl({maxWidth:110,unit:"metric"}),"bottom-left");
      timer=window.setTimeout(()=>{if(!dead)setMapError("Подложка не загрузилась. Проверьте доступ к OpenFreeMap.");},25000);
      map.on("load",()=>{if(dead)return;try{clearTimeout(timer);polishBasemap(map,latest.current.theme==="dark");const before=map.getStyle().layers?.find((layer:any)=>layer.type==="symbol")?.id;map.addSource("accident-regions",{type:"geojson",data:geo.current});map.addLayer({id:"accident-area",type:"fill",source:"accident-regions",paint:{"fill-color":["get","color"],"fill-opacity":latest.current.shade?0.28:0}},before);map.addLayer({id:"accident-outline",type:"line",source:"accident-regions",paint:{"line-color":["case",["==",["get","selected"],true],"#6366f1","#64748b"],"line-width":["case",["==",["get","selected"],true],2.5,0.7],"line-opacity":["case",["==",["get","selected"],true],1,0.55]}},before);
        canvas=document.createElement("canvas");canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;";host.current!.insertBefore(canvas,map.getCanvasContainer().nextSibling);host.current!.querySelectorAll<HTMLElement>(".maplibregl-ctrl-top-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left").forEach(node=>node.style.zIndex="2");painter.current=makePainter(canvas);map.on("render",()=>painter.current?.draw(map));canvas.addEventListener("webglcontextlost",(event)=>{event.preventDefault();setMapError("Потерян графический контекст. Нажмите «Повторить».");});map.fitBounds(USA,{padding:24,duration:0,maxZoom:5});setReady(true);setMapError("");}catch(e){setMapError(String(e));}});
      const regionAt=(e:any)=>{const f=map.getLayer("accident-area")&&map.queryRenderedFeatures(e.point,{layers:["accident-area"]})[0];if(!f)return undefined;const code=String(f.properties.code);return latest.current.result?.rows.find(r=>r.key===(latest.current.level==="state"?code:regionOf(code)));};
      const pointAt=(e:any)=>{const {data:d,result:r,selected:s}=latest.current;if(!d||!r||(!s&&map.getZoom()<6))return -1;const p=map.project([0,0]),p1=map.project([1,0]),world=(p1.x-p.x)*360;const x=(e.point.x-p.x)/world+.5,y=(e.point.y-p.y)/world+.5;let best=64/(world*world),idx=-1;for(let i=0;i<r.n;i++){const dx=r.vertices[i*3]-x,dy=r.vertices[i*3+1]-y,dd=dx*dx+dy*dy;if(dd<=best){best=dd;idx=r.indices[i];}}return idx;};
      function pointInfo(i:number){const d=latest.current.data;if(!d||i<0)return null;const o=i*20,v=d.view,a=v.getUint8(o+17),p=v.getUint8(o+18),diff=Math.abs(a-p);return {text:`Реальная тяжесть: ${cls(a)}.\nМодель сказала: ${cls(p)}.\n${diff?`Ошибка на ${["","один уровень","два уровня","три уровня"][diff]}. Модель ${p<a?"занизила":"завысила"} тяжесть.`:"Модель угадала тяжесть."}\nШтат: ${STATES[d.meta.states[v.getUint8(o+16)]]||d.meta.states[v.getUint8(o+16)]}`,coord:[v.getFloat64(o,true),v.getFloat64(o+8,true)] as [number,number]};}
      let lastHover=0;map.on("mousemove",(e:any)=>{if(!map.getLayer("accident-area")||Date.now()-lastHover<120)return;lastHover=Date.now();const info=pointInfo(pointAt(e));const row=regionAt(e);map.getCanvas().style.cursor=info||row?"pointer":"";hover?.remove();if(info){show(info.text,info.coord);return;}if(row)show(`${row.name}\nАварий в выборке: ${fmt(row.n)}\nВерных: ${pct(row.right,row.n)} · ошибок: ${pct(row.wrong,row.n)}\n${row.n<30?"Мало данных\n":""}Частая ошибка: ${frequent(row)}`,[e.lngLat.lng,e.lngLat.lat]);});
      map.getCanvas().addEventListener("mouseleave",()=>hover?.remove());
      map.on("click",(e:any)=>{hover?.remove();const info=pointInfo(pointAt(e));if(info){show(info.text,info.coord,true);return;}const row=regionAt(e);if(row)choose(row.key);});
      observer=new ResizeObserver(()=>map.resize());observer.observe(host.current);
    }).catch(e=>{if(!dead)setMapError(String(e.message||e));});
    return()=>{dead=true;abort.abort();clearTimeout(timer);observer?.disconnect();hover?.remove();popup.current?.remove();popup.current=null;painter.current?.dispose();painter.current=null;map?.remove();mapRef.current=null;geo.current=null;};
  },[attempt]);
  useEffect(()=>{if(!ready||!result||!mapRef.current||!geo.current)return;popup.current?.remove();const map=mapRef.current;painter.current?.set(result.vertices);const rows=new Map(result.rows.map(r=>[r.key,r]));map.getSource("accident-regions")?.setData({type:"FeatureCollection",features:geo.current.features.map(f=>{const code=String(f.properties.code),key=level==="state"?code:regionOf(code);return {...f,properties:{code,color:fillColor(rows.get(key)),selected:key===selected}};})});map.triggerRepaint();},[ready,result,level,selected]);
  useEffect(()=>{if(!ready||!mapRef.current||!geo.current)return;const map=mapRef.current;if(!selected){map.fitBounds(latest.current.data?.bounds||USA,{padding:24,duration:450,maxZoom:5});return;}const coords:number[][]=[];function walk(x:unknown){if(Array.isArray(x)){if(typeof x[0]==="number"&&typeof x[1]==="number")coords.push(x as number[]);else x.forEach(walk);}}geo.current.features.filter(f=>level==="state"?f.properties.code===selected:regionOf(String(f.properties.code))===selected && (!["AK","HI"].includes(String(f.properties.code)) || !!latest.current.data?.stateCounts[latest.current.data.meta.states.indexOf(String(f.properties.code))])).forEach(f=>walk(f.geometry.coordinates));
    if(coords.length){let west=180,east=-180,south=90,north=-90;coords.forEach(([x,y])=>{west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y);});map.fitBounds([[west,south],[east,north]],{padding:35,duration:500,maxZoom:9});}},[ready,selected,level,data]);
  useEffect(()=>{if(ready&&mapRef.current)polishBasemap(mapRef.current,theme==="dark");},[theme,ready]);
  useEffect(()=>{if(ready&&mapRef.current?.getLayer("accident-area"))mapRef.current.setPaintProperty("accident-area","fill-opacity",shade?(theme==="dark"?0.30:0.26):0);},[shade,theme,ready]);
  const ctl="px-3 py-1.5 rounded-lg text-xs border border-border bg-surface text-slate-700 dark:text-slate-200 hover:border-indigo-400/60 disabled:opacity-50";
  const btn=(active:boolean)=>`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${active?"bg-indigo-500 text-white shadow-sm":"text-slate-500 dark:text-slate-400 hover:bg-indigo-500/10"}`;
  const group="inline-flex flex-wrap gap-1 p-1 border border-border rounded-xl bg-surface";
  const reset=()=>{setSelected("");setState("");mapRef.current?.fitBounds(data?.bounds||USA,{padding:28,duration:450,maxZoom:5});};
  const selectedName=result?.rows.find(r=>r.key===selected)?.name;
  return <div className="mt-4 space-y-3">
    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
      <p>Одна точка — одна реальная авария из тестовой части.</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"/>Зелёная — верная оценка</span><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"/>Красная — ошибка модели</span><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 border-2 border-rose-900"/>Занижение тяжести S3/S4</span></p>
      <p>Это не прогноз аварий и не оценка опасности дорог.</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className={group} role="group" aria-label="Какие аварии показывать">{([["all","Все"],["right","Только верные"],["wrong","Только ошибочные"]] as [Mode,string][]).map(([k,v])=><button key={k} type="button" aria-pressed={mode===k} className={btn(mode===k)} onClick={()=>{setMode(k);if(k==="right")setErrorType("");}}>{v}</button>)}</div>
      <div className="text-xs text-slate-500" aria-live="polite">На карте: <b className="text-sm text-slate-800 dark:text-slate-100">{result?fmt(result.n):"—"}</b>{result?` · ${pct(result.n,result.base)} выборки`:" · загрузка точек…"}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className={group} role="group" aria-label="Выборка"><button type="button" className={btn(!balanced)} aria-pressed={!balanced} onClick={()=>setBalanced(false)}>Реальные пропорции</button><button type="button" className={btn(balanced)} aria-pressed={balanced} onClick={()=>setBalanced(true)}>Поровну по классам</button></div>
      <div className={group} role="group" aria-label="Географическая разбивка"><button type="button" className={btn(level==="state")} aria-pressed={level==="state"} onClick={()=>{setLevel("state");setSelected(state);}}>Штаты</button><button type="button" className={btn(level==="region")} aria-pressed={level==="region"} onClick={()=>{setLevel("region");setSelected(state?regionOf(state):"");}}>Регионы США</button></div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <select className={ctl} aria-label="Штат" value={state} onChange={e=>{setState(e.target.value);setSelected(e.target.value?(level==="state"?e.target.value:regionOf(e.target.value)):"");}}><option value="">Все штаты</option>{meta.states.map(s=><option key={s} value={s}>{STATES[s]||s} ({s})</option>)}</select>
      <select className={ctl} aria-label="Реальный класс" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">Все классы тяжести</option>{desc.map((_,i)=><option key={i} value={i}>{cls(i)}</option>)}</select>
      <select className={ctl} aria-label="Тип ошибки" value={errorType} onChange={e=>{setErrorType(e.target.value);if(e.target.value)setMode("wrong");}}><option value="">Любой тип ответа</option><option value="under">Модель занизила тяжесть</option><option value="over">Модель завысила тяжесть</option></select>
      <button type="button" className={ctl} disabled={!ready} onClick={reset}>Показать все регионы</button>
      <label className="inline-flex gap-1.5 items-center text-xs text-slate-500 cursor-pointer"><input type="checkbox" className="accent-indigo-500" checked={shade} onChange={e=>setShade(e.target.checked)}/>Закраска областей</label>
    </div>
    <div className="relative overflow-hidden rounded-xl border border-border bg-slate-100 dark:bg-slate-900" style={{isolation:"isolate"}}>
      <div ref={host} aria-label="Интерактивная географическая карта ошибок оценки тяжести аварий США" style={{width:"100%",height:"clamp(420px,62vh,680px)"}}/>
      {(!ready||!data||error||mapError)&&<div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/95 p-5 text-center"><div className="max-w-sm text-sm text-slate-500">{error||mapError||"Загружаем географическую карту и все точки теста…"}{(error||mapError)&&<button type="button" className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-indigo-500 text-white" onClick={()=>setAttempt(v=>v+1)}>Повторить</button>}</div></div>}
      {ready&&result&&<div className="absolute top-3 left-3 z-[4] rounded-lg border border-border bg-surface/95 px-3 py-2 text-xs pointer-events-none shadow-sm"><div className="font-semibold">{selectedName||"США"}</div><div className="mt-0.5 text-slate-500">{fmt(result.n)} точек{!result.n?" · нет данных по фильтрам":""}</div></div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <div className="flex flex-wrap items-center gap-2"><span>{shade?"Доля ошибок области:":"Закраска областей выключена"}</span>{shade&&<><span>0%</span><span className="w-24 h-2 rounded-full" style={{background:"linear-gradient(90deg,#ffefda,#991b1b)"}}/><span>100%</span><span className="inline-flex items-center gap-1.5 ml-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-400"/>Мало данных (меньше 30)</span></>}</div><span>OpenFreeMap / OpenStreetMap · границы: PublicaMundi</span>
    </div>
    {result&&<div className="rounded-xl border border-border px-3 py-2.5 text-xs space-y-1.5">
      <div className="flex flex-wrap gap-x-4 gap-y-1"><span className="font-semibold">{balanced?"Поровну по классам":"Реальные пропорции"}</span><span>{fmt(result.base)} аварий{balanced?` · ${fmt(meta.balanced_per_class)} каждого класса`:" · весь тест с координатами"}</span><span>Верных в выборке: <b className="text-emerald-600 dark:text-emerald-400">{pct(result.baseRight,result.base)}</b></span></div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500"><span>{selectedName||"В выбранной области"}: <b>{fmt(result.scope)}</b> аварий</span><span>Верных: <b>{pct(result.scopeRight,result.scope)}</b></span><span>Ошибок: <b>{pct(result.scope-result.scopeRight,result.scope)}</b></span><span>Показано: <b>{pct(result.n,result.scope)}</b></span><span>Верных среди показанных: <b>{pct(result.right,result.n)}</b></span></div>
      <p className="text-slate-500">Доля верных в выборке — не независимая оценка точности. На всём тесте: {pct(meta.accuracy,1)}.{meta.total>meta.valid?` Без отображаемых координат: ${fmt(meta.total-meta.valid)} (сохранены в файле).`:""}</p>
    </div>}
    <p className="text-[11px] text-slate-500">На общем масштабе нажмите на область, чтобы приблизить её. При приближении можно открыть отдельную аварию. Близкие точки могут перекрываться, но не удаляются. Доля ошибок области не зависит от переключателя меток и типа ошибки.</p>
    <p className="text-xs font-medium">Это уже случившиеся аварии. Зелёные: модель верно оценила тяжесть, красные: ошиблась. Цвет региона показывает долю ошибок, а не опасность дорог.</p>
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-3 flex items-center justify-between gap-2"><span className="text-sm font-semibold">{level==="state"?"Ошибки по штатам":"Ошибки по регионам США"}</span><span className="text-xs text-slate-500">Выберите область для приближения</span></div>
      <div className="max-h-[340px] overflow-auto"><table className="w-full text-xs whitespace-nowrap"><thead className="sticky top-0 bg-surface"><tr>{([["name","Область"],["n","Аварий"],["right","Верных, %"],["wrong","Ошибок, %"],["shown","На карте"]] as const).map(([k,v])=><th key={k} className={`px-3 py-2 ${k==="name"?"text-left":"text-right"}`}><button type="button" onClick={()=>setSort(s=>({key:k,asc:s.key===k?!s.asc:k==="name"}))}>{v}{sort.key===k?(sort.asc?" ↑":" ↓"):""}</button></th>)}</tr></thead><tbody>{table.map(r=><tr key={r.key} className={`border-t border-border ${selected===r.key?"bg-indigo-500/15":"hover:bg-indigo-500/5"}`}><td className="px-3 py-2"><button type="button" className="text-left hover:underline" aria-pressed={selected===r.key} onClick={()=>choose(r.key)}>{r.name}</button>{r.n<30&&<span className="ml-2 text-slate-500 text-[10px]">мало данных</span>}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(r.n)}</td><td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{pct(r.right,r.n)}</td><td className="px-3 py-2 text-right tabular-nums text-rose-600 dark:text-rose-400" title={frequent(r)}>{pct(r.wrong,r.n)}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(r.shown)}</td></tr>)}</tbody></table></div>
      <p className="px-3 py-2.5 text-[11px] text-slate-500">Доли рассчитаны по выбранной выборке, классу и штату, до фильтра верных/ошибочных и типа ошибки. Столбец «На карте» учитывает все фильтры.</p>
    </div>
  </div>;
}
