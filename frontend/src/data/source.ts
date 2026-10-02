import type { IrisDataset, RegressionDataset, WalmartDataset, WeatherDataset } from '../types';
import { generateIris, generateRegression, generateWalmart, generateWeather } from './generators';

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
export const isRemote = Boolean(API);

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
}
const pick = <T,>(path: string, demo: () => T) => (): Promise<T> => (API ? getJson<T>(path) : Promise.resolve(demo()));

export const loadIris = pick<IrisDataset>('/iris', generateIris);
export const loadRegression = pick<RegressionDataset>('/regression', generateRegression);
export const loadWalmart = pick<WalmartDataset>('/walmart', generateWalmart);
export const loadWeather = pick<WeatherDataset>('/weather', generateWeather);