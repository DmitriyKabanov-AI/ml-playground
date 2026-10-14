// Типы и хелперы городского модуля. Данные — artifacts/weather/cities/cities.json.

export type CityVariableKey = "temp" | "hum" | "rain" | "wind" | "pres";

export type CityVariableSpec = {
  key: CityVariableKey;
  label: string;
  unit: string;
  icon: string;
};

export type CityMetrics = {
  mae: number; rmse: number; r2: number; mape: number;
  bias: number; maxError: number; medae: number; skill: number;
};

export type CityForecastModel = {
  name: string;
  forecast: (number | null)[];
  sd: (number | null)[];
  metrics?: CityMetrics;
  metricsWindow?: { start: string; end: string; n: number };
};

export type CityVariableData = {
  actual: number[];
  models: CityForecastModel[];
  leadMae: Record<string, number[]>;
  metricsByHorizon?: Record<string, Record<string, CityMetrics>>;
};

export type CityDataset = {
  name: string;
  nameEn?: string;
  dates: string[];
  vars: Record<CityVariableKey, CityVariableData>;
};

export type CityEvaluationPoint = {
  date: string; actual: number; predicted: number;
  error: number; absError: number;
  low: number | null; high: number | null;
};

export const cityVariables: CityVariableSpec[] = [
  { key: "temp", label: "Температура", unit: "°C",  icon: "🌡️" },
  { key: "hum",  label: "Влажность",   unit: "%",   icon: "💧" },
  { key: "rain", label: "Осадки",      unit: "мм",  icon: "🌧️" },
  { key: "wind", label: "Ветер",       unit: "м/с", icon: "💨" },
  { key: "pres", label: "Давление",    unit: "гПа", icon: "🧭" },
];

export const cityModelNames = ["Persistence", "SARIMAX", "XGBoost", "LSTM"] as const;

const EMPTY: CityMetrics = {
  mae: 0, rmse: 0, r2: 0, mape: 0, bias: 0, maxError: 0, medae: 0, skill: 0,
};

/** Метрики берём прямо из артефакта — они уже посчитаны ноутбуком. */
export function evaluateCityModel(
  cityWeatherDemo: any,
  cityIndex: number,
  variableKey: CityVariableKey,
  modelName: string,
): CityMetrics {
  const city = cityWeatherDemo?.cities?.[cityIndex] ?? cityWeatherDemo?.cities?.[0];
  const variable = city?.vars?.[variableKey];
  if (!variable) return EMPTY;
  const model =
    variable.models.find((m: CityForecastModel) => m.name === modelName) ??
    variable.models[0];
  return model?.metrics ?? EMPTY;
}

export function cityDateTick(iso: string) {
  const p = iso.split("-");
  return `${p[2]}.${p[1]}`;
}
export function cityWeatherIcon(rain: number, temp: number, humidity: number) {
  return rain >= 1 ? (temp <= 0 ? "🌨️" : "🌧️")
    : humidity > 80 ? "☁️" : humidity > 62 ? "⛅" : "☀️";
}
