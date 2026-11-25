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
function makePainter(canvas:HTMLCanvasElement){
  const context=canvas.getContext("webgl",{alpha:true,antialias:false,premultipliedAlpha:false});if(!context)throw new Error("WebGL недоступен: включите аппаратное ускорение браузера.");const gl:WebGLRenderingContext=context;
  const shader=(kind:number,src:string)=>{const s=gl.createShader(kind)!;gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Ошибка WebGL");return s;};
  const vs=shader(gl.VERTEX_SHADER,`attribute vec3 a; uniform vec2 origin; uniform vec2 scale; uniform float size; varying float kind; void main(){gl_Position=vec4(origin+a.xy*scale,0.,1.);kind=a.z;gl_PointSize=size*(kind>1.5?1.65:1.);}`);
  const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float; varying float kind; void main(){float r=length(gl_PointCoord-vec2(.5));if(r>.5)discard;vec3 c=kind<.5?vec3(.02,.63,.32):vec3(.89,.13,.18);if(kind>1.5)c=r>.32?vec3(.35,.02,.08):vec3(.99,.20,.23);gl_FragColor=vec4(c,.88);}`);
  const program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error("Ошибка программы WebGL");gl.useProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
  const buf=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,buf);const a=gl.getAttribLocation(program,"a");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);
  const origin=gl.getUniformLocation(program,"origin"),scale=gl.getUniformLocation(program,"scale"),size=gl.getUniformLocation(program,"size");let count=0;
  return {set(v:Float32Array){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,v,gl.STATIC_DRAW);count=v.length/3;},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draw(map:any){const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;const dpr=Math.min(window.devicePixelRatio||1,2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);const p=map.project([0,0]),p1=map.project([1,0]),world=(p1.x-p.x)*360;gl.useProgram(program);gl.uniform2f(origin,2*(p.x-world/2)/w-1,1-2*(p.y-world/2)/h);gl.uniform2f(scale,2*world/w,-2*world/h);gl.uniform1f(size,(map.getZoom()<5?2.5:map.getZoom()<9?4:6)*dpr);gl.drawArrays(gl.POINTS,0,count);},
    dispose(){gl.deleteBuffer(buf);gl.deleteProgram(program);}};
}
export default function AccidentGeoMap({meta}:{meta:MapData}){
  const theme=useAppStore(s=>s.theme);const [data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[mapError,setMapError]=useState(""),[ready,setReady]=useState(false),[attempt,setAttempt]=useState(0);
  const [balanced,setBalanced]=useState(false),[mode,setMode]=useState<Mode>("wrong"),[level,setLevel]=useState<Level>("state"),[state,setState]=useState(""),[severity,setSeverity]=useState(""),[errorType,setErrorType]=useState(""),[selected,setSelected]=useState("");
  const [sort,setSort]=useState<{key:"name"|"n"|"right"|"wrong"|"shown";asc:boolean}>({key:"wrong",asc:false});
  const host=useRef<HTMLDivElement>(null);
  // External MapLibre object is kept behind a local adapter; no package dependency.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef=useRef<any>(null),popup=useRef<any>(null);const painter=useRef<ReturnType<typeof makePainter>|null>(null),geo=useRef<Geo|null>(null);
  useEffect(()=>{const controller=new AbortController();setData(null);setError("");fetch(BASE+encodeURIComponent(meta.file),{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error("Не найден файл точек. Запустите обновлённый ноутбук.");return r.arrayBuffer();}).then(b=>{if(!controller.signal.aborted)setData(decode(b,meta));}).catch(e=>{if(!controller.signal.aborted)setError(String(e.message||e));});return()=>controller.abort();},[meta,attempt]);
  const result=useMemo(()=>data?calculate(data,balanced,level,state,severity,errorType,mode,selected):null,[data,balanced,level,state,severity,errorType,mode,selected]);
  const latest=useRef({data,result,level,selected});latest.current={data,result,level,selected};
  const table=useMemo(()=>[...(result?.rows||[])].sort((a,b)=>{const k=sort.key;const f=k==="name"?a.name.localeCompare(b.name,"ru"):k==="n"||k==="shown"?a[k]-b[k]:((a.n?a[k]/a.n:-1)-(b.n?b[k]/b.n:-1));return sort.asc?f:-f;}),[result,sort]);
  const choose=(key:string)=>{setSelected(key);setState(prev=>prev&&(latest.current.level==="state"?prev:regionOf(prev))!==key?"":prev);};
  useEffect(()=>{let dead=false;let observer:ResizeObserver|undefined;let canvas:HTMLCanvasElement|undefined;let timer:number|undefined;const abort=new AbortController();setReady(false);setMapError("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map:any;let hover:any;let lib:any;
    const show=(text:string,coord:[number,number],permanent=false)=>{if(permanent){popup.current?.remove();popup.current=new lib.Popup({closeButton:true,maxWidth:"300px"}).setLngLat(coord).setDOMContent(popupText(text)).addTo(map);}else{hover?.remove();hover=new lib.Popup({closeButton:false,closeOnClick:false,offset:10,maxWidth:"300px"}).setLngLat(coord).setDOMContent(popupText(text)).addTo(map);hover.getElement().style.pointerEvents="none";const content=hover.getElement().querySelector(".maplibregl-popup-content");if(content)content.style.pointerEvents="none";}};
    Promise.all([loadLibrary(),fetch(GEO,{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error("Не загрузились границы штатов");return r.json();})]).then(([l,g])=>{
      if(dead||!host.current)return;lib=l;geo.current={type:"FeatureCollection",features:(g as Geo).features.filter(f=>EN[String(f.properties.name)]).map(f=>({...f,properties:{code:EN[String(f.properties.name)],color:"#9ca3af",selected:false}}))};if(geo.current.features.length<48)throw new Error("Не удалось получить границы штатов США");
      map=new lib.Map({container:host.current,style:"https://tiles.openfreemap.org/styles/liberty",center:[-96,38],zoom:3,minZoom:1,maxZoom:15,maxPitch:0,pitchWithRotate:false,dragRotate:false,touchPitch:false,renderWorldCopies:false});mapRef.current=map;map.touchZoomRotate?.disableRotation();map.addControl(new lib.NavigationControl({showCompass:false}),"top-right");
      timer=window.setTimeout(()=>{if(!dead)setMapError("Подложка не загрузилась. Проверьте доступ к OpenFreeMap.");},25000);
      map.on("load",()=>{if(dead)return;try{clearTimeout(timer);map.addSource("accident-regions",{type:"geojson",data:geo.current});map.addLayer({id:"accident-area",type:"fill",source:"accident-regions",paint:{"fill-color":["get","color"],"fill-opacity":0.55}});map.addLayer({id:"accident-outline",type:"line",source:"accident-regions",paint:{"line-color":["case",["==",["get","selected"],true],"#4338ca","#64748b"],"line-width":["case",["==",["get","selected"],true],3,0.8]}});
        canvas=document.createElement("canvas");canvas.style.cssText="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";host.current!.insertBefore(canvas,map.getCanvasContainer().nextSibling);painter.current=makePainter(canvas);map.on("render",()=>painter.current?.draw(map));canvas.addEventListener("webglcontextlost",(event)=>{event.preventDefault();setMapError("Потерян графический контекст. Нажмите «Повторить».");});map.fitBounds(USA,{padding:24,duration:0,maxZoom:5});setReady(true);setMapError("");}catch(e){setMapError(String(e));}});
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
  useEffect(()=>{if(!ready)return;const map=mapRef.current;const layers=map?.getStyle()?.layers||[];for(const l of layers){if(l.type==="background")try{map.setPaintProperty(l.id,"background-color",theme==="dark"?"#1e293b":"#f1f5f9");}catch{}}},[theme,ready]);
  const ctl="rounded-lg border border-border bg-surface px-3 py-2 text-xs";const btn=(active:boolean)=>`${ctl} ${active?"bg-indigo-600 text-white font-semibold":"text-slate-600 dark:text-slate-300"}`;
  const reset=()=>{setSelected("");setState("");mapRef.current?.fitBounds(data?.bounds||USA,{padding:24,duration:450,maxZoom:5});};
  return <div className="space-y-4 mt-3">
    <div className="space-y-1 text-sm"><p>Одна точка — одна уже случившаяся авария из тестовой части.</p><p><span className="font-semibold text-emerald-600">● Зелёная — модель угадала тяжесть</span> · <span className="font-semibold text-red-600">● Красная — ошиблась.</span></p><p className="font-medium">Карта не показывает риск, опасность дорог или будущие аварии.</p></div>
    <div className="flex flex-wrap items-center gap-2">{([["all","Все"],["right","Только верные"],["wrong","Только ошибочные"]] as [Mode,string][]).map(([k,v])=><button key={k} aria-pressed={mode===k} className={btn(mode===k)} onClick={()=>{setMode(k);if(k==="right")setErrorType("");}}>{v}</button>)}<span className="text-sm font-semibold">{result?`${fmt(result.n)} точек · ${pct(result.n,result.base)} выборки` : "Загрузка точек…"}</span></div>
    <div className="flex flex-wrap gap-2"><button className={btn(!balanced)} aria-pressed={!balanced} onClick={()=>setBalanced(false)}>Реальные пропорции</button><button className={btn(balanced)} aria-pressed={balanced} onClick={()=>setBalanced(true)}>Поровну по классам</button><span className="text-xs self-center">{balanced?`${fmt(meta.balanced_per_class)} аварий каждого класса`:`Весь тест: ${fmt(meta.total)} аварий`}</span></div>
    {result&&<p className="text-sm">Выборка «{balanced?"Поровну по классам":"Реальные пропорции"}»: {fmt(result.base)} точек, верных {pct(result.baseRight,result.base)}. Это доля в выборке, не независимая оценка точности модели. На всём тесте — {pct(meta.accuracy,1)}. {meta.total>meta.valid&&`Без отображаемых координат: ${fmt(meta.total-meta.valid)} (сохранены в файле).`}</p>}
    <div className="flex flex-wrap items-center gap-2"><button className={btn(level==="state")} aria-pressed={level==="state"} onClick={()=>{setLevel("state");setSelected("");}}>Штаты</button><button className={btn(level==="region")} aria-pressed={level==="region"} onClick={()=>{setLevel("region");setSelected("");}}>Регионы США</button><button className={ctl} onClick={reset}>Показать все регионы</button>
      <select className={ctl} aria-label="Реальный класс" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="">Все классы тяжести</option>{desc.map((_,i)=><option key={i} value={i}>{cls(i)}</option>)}</select>
      <select className={ctl} aria-label="Штат" value={state} onChange={e=>{setState(e.target.value);setSelected(e.target.value?(level==="state"?e.target.value:regionOf(e.target.value)):"");}}><option value="">Все штаты</option>{meta.states.map(s=><option key={s} value={s}>{STATES[s]||s} ({s})</option>)}</select>
      <select className={ctl} aria-label="Тип ошибки" value={errorType} onChange={e=>{setErrorType(e.target.value);if(e.target.value)setMode("wrong");}}><option value="">Любой тип ответа</option><option value="under">Модель занизила тяжесть</option><option value="over">Модель завысила тяжесть</option></select>
    </div>
    {result&&<div className="flex flex-wrap gap-4 text-sm"><span>В выбранной области: <b>{fmt(result.scope)}</b></span><span>Верных: <b>{pct(result.scopeRight,result.scope)}</b></span><span>Ошибок: <b>{pct(result.scope-result.scopeRight,result.scope)}</b></span><span>Показано в области: <b>{pct(result.n,result.scope)}</b> · верных среди показанных: <b>{pct(result.right,result.n)}</b></span></div>}
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>Цвет области — доля ошибок:</span><span>0%</span><span className="h-3 w-28 rounded" style={{background:"linear-gradient(90deg,#ffefda,#991b1b)"}}/><span>100%</span><span><span className="inline-block w-3 h-3 bg-gray-400 rounded mr-1"/>Мало данных: меньше 30</span><span className="text-red-600 font-semibold">◉ Крупная красная с тёмным краем — занижение S3/S4</span></div>
    <div className="grid xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] gap-3">
      <div className="relative overflow-hidden rounded-xl border border-border"><div ref={host} style={{height:"clamp(440px,65vh,720px)",width:"100%"}} aria-label="Карта ошибок оценки тяжести аварий"/>{(!ready||!data||error||mapError)&&<div className="absolute inset-0 bg-surface/95 flex items-center justify-center text-center p-5 text-sm"><div>{error||mapError||"Загружаем карту и все точки теста…"}{(error||mapError)&&<button className={`${ctl} block mx-auto mt-3`} onClick={()=>setAttempt(v=>v+1)}>Повторить</button>}</div></div>}</div>
      <div className="border border-border rounded-xl overflow-hidden"><div className="p-3 text-sm font-semibold">{level==="state"?"По штатам":"По регионам США"}</div><div className="max-h-[640px] overflow-auto"><table className="w-full text-xs"><thead className="sticky top-0 bg-surface"><tr>{([["name","Область"],["n","Аварий"],["right","Верных"],["wrong","Ошибок"],["shown","На карте"]] as const).map(([k,v])=><th key={k} className="p-2 text-left"><button onClick={()=>setSort(s=>({key:k,asc:s.key===k?!s.asc:k==="name"}))}>{v}{sort.key===k?(sort.asc?" ↑":" ↓"):""}</button></th>)}</tr></thead><tbody>{table.map(r=><tr key={r.key} className={`border-t border-border ${selected===r.key?"bg-indigo-500/20":""}`}><td className="p-2"><button className="text-left underline decoration-dotted" onClick={()=>choose(r.key)}>{r.name}</button>{r.n<30&&<div className="text-slate-500">мало данных</div>}</td><td className="p-2">{fmt(r.n)}</td><td className="p-2">{pct(r.right,r.n)}</td><td className="p-2" title={frequent(r)}>{pct(r.wrong,r.n)}</td><td className="p-2">{fmt(r.shown)}</td></tr>)}</tbody></table></div><p className="p-3 text-xs text-slate-500">Доли рассчитаны до фильтра верных/ошибочных и типа ошибки, внутри выбранного класса и штата. Столбец «На карте» учитывает все фильтры. Нажмите на название области, чтобы приблизить её.</p></div>
    </div>
    <p className="text-xs text-slate-500">Нажмите на область на общем масштабе для приближения, затем наведите или нажмите на точку для подробностей. Все области также доступны через таблицу. На общем масштабе близкие аварии перекрываются, но точки не удаляются. Цвет области не зависит от переключателя меток. Подложка: OpenFreeMap / OpenStreetMap; границы: PublicaMundi.</p>
    <p className="text-sm font-medium">Это уже случившиеся аварии. Зелёные: модель верно оценила тяжесть, красные: ошиблась. Цвет региона показывает долю ошибок, а не опасность дорог.</p>
  </div>;
}
