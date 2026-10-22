import { fetchWithTimeout, type FetchFn } from './fetchWithTimeout';

export const GEOCODING_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Construye la URL de búsqueda: name URL-encoded y count=1. */
export function buildGeocodingUrl(cityName: string): string {
  const params = new URLSearchParams({ name: cityName, count: '1' });
  return `${GEOCODING_BASE_URL}?${params.toString()}`;
}

/**
 * Llama a la Geocoding API. Devuelve la Response cruda o lanza
 * { type: 'TIMEOUT' } / { type: 'NETWORK_ERROR' }.
 */
export function requestGeocoding(cityName: string, fetchFn?: FetchFn): Promise<Response> {
  return fetchWithTimeout(buildGeocodingUrl(cityName), fetchFn);
}
