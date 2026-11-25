"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { AccidentSample, fmtInt, isNum } from "@/lib/data/reports";

// Same vector basemap / WebGL engine as the reference project. The library is
// loaded only on this page; npm dependencies and the existing lockfile stay intact.
const VERSION = "4.7.1";
const CDN = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/`;
const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const USA: Bounds = [[-125, 24], [-66, 50]];
const COLORS: Record<string, string> = { S1: "#34d399", S2: "#0ea5e9", S3: "#f59e0b", S4: "#f43f5e" };
const colorOf = (c: string) => COLORS[c] ?? "#6366f1";
const MODES = [
  { id: "points", label: "Точки", note: "Цвет — истинный класс тяжести. Нажмите на точку для деталей." },
  { id: "clusters", label: "Кластеры", note: "Число в круге — количество аварий в выборке. Нажмите для раскрытия." },
  { id: "heat", label: "Тепловая карта", note: "Цвет — относительная концентрация отображаемой выборки, а не риск аварий." },
] as const;
type Mode = typeof MODES[number]["id"];
type Coord = [number, number];
type Bounds = [Coord, Coord];
type Feature = { type: "Feature"; geometry: { type: "Point"; coordinates: Coord }; properties: { index: number; severity: string; color: string; correct: boolean } };
type Collection = { type: "FeatureCollection"; features: Feature[] };
type Source = { setData(data: Collection): unknown; getClusterExpansionZoom(id: number): Promise<number> };
type RenderedFeature = { geometry: { type: string; coordinates?: Coord }; properties?: Record<string, unknown>; layer: { id: string } };
type MapEvent = { point: unknown; lngLat: { lng: number; lat: number }; error?: Error };
type Layer = { id: string; type: string; layout?: Record<string, unknown> };
type MapInstance = {
  on(type: string, fn: (event: MapEvent) => void): unknown;
  addSource(id: string, source: Record<string, unknown>): unknown;
  getSource(id: string): Source | undefined;
  addLayer(layer: Record<string, unknown>): unknown;
  getLayer(id: string): unknown;
  getStyle(): { layers?: Layer[] };
  setLayoutProperty(id: string, name: string, value: unknown): unknown;
  setPaintProperty(id: string, name: string, value: unknown): unknown;
  addControl(control: unknown, position: string): unknown;
  fitBounds(bounds: Bounds, options: Record<string, unknown>): unknown;
  easeTo(options: Record<string, unknown>): unknown;
  getZoom(): number;
  getCanvas(): HTMLCanvasElement;
  queryRenderedFeatures(point: unknown, options: { layers: string[] }): RenderedFeature[];
  resize(): unknown;
  remove(): unknown;
};
type Popup = { setLngLat(coord: Coord): Popup; setDOMContent(node: HTMLElement): Popup; addTo(map: MapInstance): Popup; remove(): unknown };
type MapLibrary = {
  Map: new (options: Record<string, unknown>) => MapInstance;
  NavigationControl: new (options: Record<string, unknown>) => unknown;
  ScaleControl: new (options: Record<string, unknown>) => unknown;
  Popup: new (options: Record<string, unknown>) => Popup;
};
let libraryPromise: Promise<MapLibrary> | undefined;
function loadLibrary(): Promise<MapLibrary> {
  if (libraryPromise) return libraryPromise;
  libraryPromise = new Promise<MapLibrary>((resolve, reject) => {
    const script = document.createElement("script");
    const css = document.createElement("link");
    const global = window as unknown as { maplibregl?: MapLibrary };
    let jsReady = false, cssReady = false, finished = false;
    const fail = () => {
      if (finished) return;
      finished = true; window.clearTimeout(timer); script.remove(); css.remove();
      reject(new Error("Не удалось загрузить MapLibre GL. Проверьте доступ к cdn.jsdelivr.net."));
    };
    const check = () => {
      if (finished || !jsReady || !cssReady) return;
      if (!global.maplibregl) { fail(); return; }
      finished = true; window.clearTimeout(timer); resolve(global.maplibregl);
    };
    const timer = window.setTimeout(fail, 18000);
    css.rel = "stylesheet"; css.href = `${CDN}maplibre-gl.css`;
    css.onload = () => { cssReady = true; check(); }; css.onerror = fail;
    script.src = `${CDN}maplibre-gl.js`; script.async = true;
    script.onload = () => { jsReady = true; check(); }; script.onerror = fail;
    document.head.append(css, script);
  }).catch((error: unknown) => { libraryPromise = undefined; throw error; });
  return libraryPromise;
}

function validCoordinates(s: AccidentSample): s is AccidentSample & { lng: number; lat: number } {
  return typeof s.lng === "number" && typeof s.lat === "number" && Number.isFinite(s.lng) && Number.isFinite(s.lat)
    && Math.abs(s.lng) <= 180 && Math.abs(s.lat) <= 85.05112878 && !(s.lng === 0 && s.lat === 0);
}
function makeCollection(samples: AccidentSample[]): Collection {
  return { type: "FeatureCollection", features: samples.flatMap((s, index): Feature[] => validCoordinates(s) ? [{
    type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] },
    properties: { index, severity: s.true, color: colorOf(s.true), correct: s.correct },
  }] : []) };
}
const EMPTY: Collection = { type: "FeatureCollection", features: [] };
const POINT = "accident-points", CLUSTER_POINT = "accident-cluster-points", CLUSTER = "accident-clusters", COUNT = "accident-count", HEAT = "accident-heat";
const MODE_LAYERS: Record<Mode, string[]> = { points: [POINT], clusters: [CLUSTER_POINT, CLUSTER, COUNT], heat: [HEAT] };

function addLayers(map: MapInstance) {
  const font = map.getStyle().layers?.find((layer) => layer.type === "symbol" && Array.isArray(layer.layout?.["text-font"]) && (layer.layout?.["text-font"] as unknown[]).every((v) => typeof v === "string"))?.layout?.["text-font"];
  map.addSource("accident-plain", { type: "geojson", data: EMPTY });
  map.addSource("accident-grouped", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 46, clusterMaxZoom: 14 });
  const pointPaint = { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 3, 5, 4, 10, 6, 15, 9], "circle-opacity": 0.86, "circle-stroke-width": 0.9, "circle-stroke-color": "#ffffff" };
  map.addLayer({ id: HEAT, type: "heatmap", source: "accident-plain", layout: { visibility: "none" }, paint: {
    "heatmap-weight": 1, "heatmap-intensity": 1,
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 2, 16, 7, 30, 15, 46],
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(37,99,235,0)", 0.15, "#2563eb", 0.35, "#06b6d4", 0.55, "#34d399", 0.75, "#fbbf24", 1, "#f43f5e"], "heatmap-opacity": 0.85,
  } });
  map.addLayer({ id: POINT, type: "circle", source: "accident-plain", paint: pointPaint });
  map.addLayer({ id: CLUSTER_POINT, type: "circle", source: "accident-grouped", filter: ["!", ["has", "point_count"]], paint: pointPaint });
  map.addLayer({ id: CLUSTER, type: "circle", source: "accident-grouped", filter: ["has", "point_count"], paint: {
    "circle-color": ["step", ["get", "point_count"], "#6366f1", 30, "#4f46e5", 100, "#3730a3"],
    "circle-radius": ["step", ["get", "point_count"], 15, 30, 21, 100, 28], "circle-opacity": 0.92, "circle-stroke-width": 1.5, "circle-stroke-color": "#a5b4fc",
  } });
  map.addLayer({ id: COUNT, type: "symbol", source: "accident-grouped", filter: ["has", "point_count"], layout: {
    "text-field": ["to-string", ["get", "point_count_abbreviated"]], "text-font": font ?? ["Noto Sans Regular"], "text-size": 12, "text-allow-overlap": true, "text-ignore-placement": true,
  }, paint: { "text-color": "#ffffff" } });
}
function applyMode(map: MapInstance, mode: Mode) {
  for (const [key, layers] of Object.entries(MODE_LAYERS)) {
    layers.forEach((id) => map.setLayoutProperty(id, "visibility", key === mode ? "visible" : "none"));
  }
}
// Adapt the reference basemap palette to ML Hub; leave boundaries, state/city
// labels and roads visible, and never recolor the accident data layers.
function polishBasemap(map: MapInstance, dark: boolean) {
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
function popupContent(items: AccidentSample[]): HTMLElement {
  const root = document.createElement("div");
  root.style.cssText = "font:12px/1.55 Inter,system-ui,sans-serif;color:#17223b;min-width:190px;max-width:260px;padding:4px;";
  const detail = document.createElement("div");
  const render = (s: AccidentSample) => {
    detail.replaceChildren();
    const title = document.createElement("strong"); title.textContent = `${s.state || "—"} · ${String(s.hour).padStart(2, "0")}:00`; title.style.fontSize = "14px"; detail.append(title);
    const row = (label: string, value: string, color?: string) => {
      const line = document.createElement("div"); const text = document.createElement("span"); text.textContent = `${label}: `;
      const val = document.createElement("b"); val.textContent = value; if (color) val.style.color = color;
      line.append(text, val); detail.append(line);
    };
    row("Истинный класс", s.true, colorOf(s.true)); row("Предсказано", s.predicted, s.correct ? "#059669" : "#e11d48");
    row("Результат", s.correct ? "Верно" : "Ошибка модели", s.correct ? "#059669" : "#e11d48");
    row("Температура", isNum(s.temperature_f) ? `${s.temperature_f.toFixed(0)}°F` : "—");
    row("Видимость", isNum(s.visibility_mi) ? `${s.visibility_mi.toFixed(1)} mi` : "—");
    row("Координаты", validCoordinates(s) ? `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}` : "—");
  };
  if (items.length > 1) {
    const select = document.createElement("select"); select.style.cssText = "width:100%;margin:4px 0 8px;border:1px solid #cbd5e1;border-radius:6px;padding:4px;color:#17223b;background:#fff";
    select.setAttribute("aria-label", "Выбор аварии в одной точке");
    items.forEach((s, i) => { const option = document.createElement("option"); option.value = String(i); option.textContent = `${i + 1} из ${items.length} · ${s.true} → ${s.predicted}`; select.append(option); });
    select.addEventListener("change", () => render(items[Number(select.value)])); root.append(select);
  }
  root.append(detail); render(items[0]); return root;
}

export default function AccidentGeoMap({ samples, classes, onlyErrors }: { samples: AccidentSample[]; classes: string[]; onlyErrors: boolean }) {
  const theme = useAppStore((s) => s.theme);
  const [mode, setMode] = useState<Mode>("points");
  const [state, setState] = useState("");
  const [severity, setSeverity] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tileError, setTileError] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const states = useMemo(() => [...new Set(samples.map((s) => s.state).filter((s): s is string => typeof s === "string" && s.length > 0))].sort(), [samples]);
  const shownIndices = useMemo(() => new Set(samples.flatMap((s, i) => (!onlyErrors || !s.correct) && (!state || s.state === state) && (!severity || s.true === severity) ? [i] : [])), [samples, state, severity, onlyErrors]);
  const shown = useMemo(() => samples.filter((_, i) => shownIndices.has(i)), [samples, shownIndices]);
  const allData = useMemo(() => makeCollection(samples), [samples]);
  const data = useMemo<Collection>(() => ({ type: "FeatureCollection", features: allData.features.filter((f) => shownIndices.has(f.properties.index)) }), [allData, shownIndices]);
  const latest = useRef({ mode, theme, samples, shown, shownIndices, data });
  latest.current = { mode, theme, samples, shown, shownIndices, data };

  useEffect(() => {
    let disposed = false, loaded = false;
    let map: MapInstance | undefined, observer: ResizeObserver | undefined;
    let timeout: number | undefined;
    setReady(false); setError(""); setTileError(false);
    const fail = (message: string) => { if (!disposed) setError(message); };
    void loadLibrary().then((lib) => {
      if (disposed || !host.current) return;
      map = new lib.Map({ container: host.current, style: STYLE, center: [-96, 38], zoom: 3, minZoom: 1, maxZoom: 19,
        maxPitch: 0, pitchWithRotate: false, dragRotate: false, renderWorldCopies: false, attributionControl: true,
      });
      const current = map; mapRef.current = current;
      current.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
      current.addControl(new lib.ScaleControl({ maxWidth: 110, unit: "metric" }), "bottom-left");
      timeout = window.setTimeout(() => { if (!loaded) fail("Географическая подложка не загрузилась. Проверьте доступ к tiles.openfreemap.org."); }, 25000);
      current.on("load", () => {
        if (disposed) return;
        try {
          polishBasemap(current, latest.current.theme === "dark"); addLayers(current);
          if ([POINT, CLUSTER_POINT, CLUSTER, COUNT, HEAT].some((id) => !current.getLayer(id))) throw new Error("Не удалось создать все слои визуализации аварий.");
          current.getSource("accident-plain")?.setData(latest.current.data);
          current.getSource("accident-grouped")?.setData(latest.current.data);
          applyMode(current, latest.current.mode);
          current.fitBounds(USA, { padding: 28, duration: 0, maxZoom: 5 });
          loaded = true; window.clearTimeout(timeout); setError(""); setReady(true);
        } catch (e) { fail(e instanceof Error ? e.message : "Не удалось создать слои карты."); }
      });
      current.on("error", (event) => { if (!disposed && loaded && event.error) setTileError(true); });
      const hit = (event: MapEvent) => {
        if (!loaded || latest.current.mode === "heat") return [];
        return current.queryRenderedFeatures(event.point, { layers: latest.current.mode === "clusters" ? [CLUSTER_POINT, CLUSTER, COUNT] : [POINT] });
      };
      current.on("mousemove", (event) => { current.getCanvas().style.cursor = hit(event).length ? "pointer" : ""; });
      current.on("click", (event) => {
        const f = hit(event)[0]; if (!f || f.geometry.type !== "Point" || !f.geometry.coordinates) return;
        const coord = f.geometry.coordinates;
        popupRef.current?.remove(); popupRef.current = null;
        if (f.properties?.cluster_id != null) {
          const id = Number(f.properties.cluster_id);
          void current.getSource("accident-grouped")?.getClusterExpansionZoom(id).then((zoom) => {
            if (!disposed && latest.current.mode === "clusters") current.easeTo({ center: coord, zoom: Math.max(current.getZoom() + 1, zoom), duration: 450 });
          }).catch(() => { /* The cluster may have changed after filtering. */ });
          return;
        }
        const index = Number(f.properties?.index);
        const s = latest.current.samples[index]; if (!s || !validCoordinates(s) || !latest.current.shownIndices.has(index)) return;
        const items = latest.current.shown.filter((item) => item.lng === s.lng && item.lat === s.lat);
        popupRef.current = new lib.Popup({ closeButton: true, maxWidth: "300px", offset: 12 }).setLngLat([s.lng, s.lat]).setDOMContent(popupContent(items)).addTo(current);
      });
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => { if (!disposed) current.resize(); }); observer.observe(host.current);
      }
    }).catch((e: unknown) => fail(e instanceof Error ? e.message : "Не удалось открыть карту."));
    return () => { disposed = true; window.clearTimeout(timeout); observer?.disconnect(); popupRef.current?.remove(); popupRef.current = null; map?.remove(); mapRef.current = null; };
  }, [attempt]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    popupRef.current?.remove(); popupRef.current = null;
    mapRef.current.getSource("accident-plain")?.setData(data);
    mapRef.current.getSource("accident-grouped")?.setData(data);
  }, [data, ready]);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    popupRef.current?.remove(); popupRef.current = null; applyMode(mapRef.current, mode);
  }, [mode, ready]);
  useEffect(() => { if (ready && mapRef.current) polishBasemap(mapRef.current, theme === "dark"); }, [theme, ready]);

  const fit = () => {
    const map = mapRef.current; if (!map) return;
    const coords = data.features.map((f) => f.geometry.coordinates);
    if (!coords.length) return;
    const bounds: Bounds = [[180, 90], [-180, -90]];
    coords.forEach(([lng, lat]) => { bounds[0][0] = Math.min(bounds[0][0], lng); bounds[0][1] = Math.min(bounds[0][1], lat); bounds[1][0] = Math.max(bounds[1][0], lng); bounds[1][1] = Math.max(bounds[1][1], lat); });
    if (bounds[1][0] - bounds[0][0] > 180) { map.fitBounds(USA, { padding: 28, duration: 450, maxZoom: 5 }); return; }
    map.fitBounds(bounds, { padding: 42, duration: 450, maxZoom: 11 });
  };
  const control = "px-3 py-1.5 rounded-lg text-xs border border-border bg-surface text-slate-700 dark:text-slate-200 disabled:opacity-50";
  return <div className="mt-4 space-y-3">
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex flex-wrap gap-1 p-1 border border-border rounded-xl" role="group" aria-label="Тип карты">
        {MODES.map((m) => <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)} className={`px-3 py-2 rounded-lg text-xs font-semibold ${mode === m.id ? "bg-indigo-500 text-white" : "text-slate-500 hover:bg-indigo-500/10"}`}>{m.label}</button>)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Штат" value={state} onChange={(e) => setState(e.target.value)} className={control}><option value="">Все штаты</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select aria-label="Класс тяжести" value={severity} onChange={(e) => setSeverity(e.target.value)} className={control}><option value="">Все классы</option>{classes.map((c) => <option key={c} value={c}>{c}</option>)}</select>
        <button type="button" disabled={!ready || !data.features.length} onClick={fit} className={control}>К точкам</button>
        <button type="button" disabled={!ready} onClick={() => mapRef.current?.fitBounds(USA, { padding: 28, duration: 450, maxZoom: 5 })} className={control}>США · 48 смежных штатов</button>
      </div>
    </div>
    <div className="relative overflow-hidden rounded-xl border border-border bg-slate-100 dark:bg-slate-900" style={{ isolation: "isolate" }}>
      <div ref={host} aria-label="Интерактивная географическая карта аварий США" style={{ width: "100%", height: "clamp(420px, 62vh, 680px)" }} />
      {!ready && <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/90 p-5 text-center">
        <div className="max-w-sm text-sm text-slate-500">{error || "Загрузка географической карты США…"}{error && <button type="button" onClick={() => setAttempt((v) => v + 1)} className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-indigo-500 text-white">Повторить</button>}</div>
      </div>}
      {ready && !data.features.length && <div className="absolute top-3 left-3 z-10 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-slate-500 pointer-events-none">Нет точек для выбранных фильтров</div>}
    </div>
    {tileError && <p className="text-xs text-amber-600 dark:text-amber-400">Часть ресурсов географической подложки не загрузилась. <button type="button" className="underline" onClick={() => setAttempt((v) => v + 1)}>Перезагрузить карту</button></p>}
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <div className="flex flex-wrap items-center gap-3">
        {mode !== "heat" && classes.map((c) => <span key={c} className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: colorOf(c) }} />{c}</span>)}
        {mode === "clusters" && <span>Индиго — кластер</span>}
        {mode === "heat" && <span className="inline-flex items-center gap-2">Меньше <span className="w-28 h-2 rounded-full" style={{ background: "linear-gradient(90deg,#2563eb,#06b6d4,#34d399,#fbbf24,#f43f5e)" }} /> Больше</span>}
      </div>
      <span>На карте: <b>{fmtInt(data.features.length)}</b> из {fmtInt(shown.length)} выбранных{shown.length > data.features.length ? ` · без валидных координат: ${fmtInt(shown.length - data.features.length)}` : ""}</span>
    </div>
    <p className="text-[11px] text-slate-500">{MODES.find((m) => m.id === mode)?.note} Географическая подложка: OpenFreeMap / OpenStreetMap. Все точки — из исходного отчёта, без изменения координат.</p>
  </div>;
}
