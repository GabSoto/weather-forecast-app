import { fetchWithTimeout, FORECAST_TIMEOUT_MS, type FetchFn } from './fetchWithTimeout';

export const FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

/**
 * Parámetro current con el nombre actual de la API (relative_humidity_2m).
 * requirements.md menciona el nombre legacy; ver nota en tasks-v2.md.
 */
export const CURRENT_VARIABLES = ['temperature_2m', 'relative_humidity_2m', 'precipitation'] as const;

/** Construye la URL de pronóstico con latitude, longitude y current. */
export function buildForecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: CURRENT_VARIABLES.join(','),
  });
  return `${FORECAST_BASE_URL}?${params.toString()}`;
}

/**
 * Llama a la Forecast API. Devuelve la Response cruda o lanza
 * { type: 'TIMEOUT' } / { type: 'NETWORK_ERROR' }.
 */
export function requestForecast(latitude: number, longitude: number, fetchFn?: FetchFn): Promise<Response> {
  return fetchWithTimeout(buildForecastUrl(latitude, longitude), fetchFn, FORECAST_TIMEOUT_MS);
}
