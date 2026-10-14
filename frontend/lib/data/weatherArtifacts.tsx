"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Value = { weatherDemo: any; cityWeatherDemo: any };
const WeatherCtx = createContext<Value | null>(null);

export function WeatherDataProvider({ children }: { children: ReactNode }) {
  const [weatherDemo, setWeatherDemo] = useState<any>(null);
  const [cityWeatherDemo, setCityWeatherDemo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    Promise.all([
      fetch("/artifacts/weather/cities/stations.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(`stations.json HTTP ${r.status}`))),
      fetch("/artifacts/weather/cities/cities.json", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject(`cities.json HTTP ${r.status}`))),
    ])
      .then(([s, c]) => { if (!cancel) { setWeatherDemo(s); setCityWeatherDemo(c); } })
      .catch((e) => { if (!cancel) setError(String(e)); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  if (loading) return (
    <div className="page-content" style={{ padding: 40, textAlign: "center" }}>
      Загрузка weather/cities/*.json…
    </div>
  );

  if (error || !weatherDemo || !cityWeatherDemo) return (
    <div className="page-content" style={{ padding: 40, textAlign: "center", color: "#fb7185" }}>
      Не удалось загрузить weather-артефакты: {error ?? "нет данных"}
    </div>
  );

  return <WeatherCtx.Provider value={{ weatherDemo, cityWeatherDemo }}>{children}</WeatherCtx.Provider>;
}

export function useWeatherData(): Value {
  const v = useContext(WeatherCtx);
  if (!v) throw new Error("useWeatherData must be used inside WeatherDataProvider");
  return v;
}
