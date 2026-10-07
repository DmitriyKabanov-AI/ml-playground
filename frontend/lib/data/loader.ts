"use client";
import { useEffect, useState } from "react";

const BASE = "/artifacts";

function sanitizeJson(text: string): string {
  return text
    .replace(/:\s*NaN\b/g, ": null")
    .replace(/:\s*-?Infinity\b/g, ": null")
    .replace(/\[\s*NaN\b/g, "[null")
    .replace(/,\s*NaN\b/g, ",null")
    .replace(/\[\s*-?Infinity\b/g, "[null")
    .replace(/,\s*-?Infinity\b/g, ",null");
}

async function fetchJson<T = any>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}/${path}`, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[loader] ${path} → HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      console.warn(`[loader] ${path} → raw JSON.parse failed, чищу NaN/Infinity`, e);
      try {
        const data = JSON.parse(sanitizeJson(text)) as T;
        console.info(`[loader] ${path} → parse OK после санитайза`);
        return data;
      } catch (e2) {
        console.error(`[loader] ${path} → не парсится даже после санитайза`, e2);
        console.error(`[loader] ${path} → первые 300 символов:`, text.slice(0, 300));
        return null;
      }
    }
  } catch (e) {
    console.error(`[loader] ${path} → fetch failed:`, e);
    return null;
  }
}

async function fetchText(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}/${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(",").map((s) => s.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

export function useJson<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!path) { setData(null); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    setError(null);
    fetchJson<T>(path).then((d) => {
      if (cancel) return;
      if (d === null) setError(`Не удалось загрузить ${path}`);
      else setData(d);
      setLoading(false);
    });
    return () => { cancel = true; };
  }, [path]);
  return { data, loading, error };
}

export function useCsv(path: string | null) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(!!path);
  useEffect(() => {
    if (!path) { setRows([]); setLoading(false); return; }
    let cancel = false;
    setLoading(true);
    fetchText(path).then((t) => { if (!cancel) { setRows(t ? parseCsv(t) : []); setLoading(false); } });
    return () => { cancel = true; };
  }, [path]);
  return { rows, loading };
}
