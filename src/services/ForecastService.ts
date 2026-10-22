import { requestForecast } from '../clients/ForecastClient';
import { isHttpClientError } from '../clients/fetchWithTimeout';
import type { ForecastResult, WeatherData } from '../types';

export type ForecastRequestFn = (latitude: number, longitude: number) => Promise<Response>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Servicio de pronóstico. Orquesta la llamada al cliente HTTP y mapea
 * el bloque `current` a WeatherData sin transformar los valores.
 */
export class ForecastService {
  constructor(private readonly request: ForecastRequestFn = requestForecast) {}

  async getForecast(lat: number, lon: number): Promise<ForecastResult> {
    let response: Response;
    try {
      response = await this.request(lat, lon);
    } catch (err) {
      if (isHttpClientError(err)) {
        return { success: false, error: { type: err.type } };
      }
      return { success: false, error: { type: 'NETWORK_ERROR' } };
    }

    if (!response.ok) {
      return { success: false, error: { type: 'SERVICE_ERROR', statusCode: response.status } };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return { success: false, error: { type: 'INVALID_RESPONSE' } };
    }

    if (!isPlainObject(body)) {
      return { success: false, error: { type: 'INVALID_RESPONSE' } };
    }

    // Falta el bloque current, o alguno de sus campos es nulo/ausente/no numérico.
    const current = body.current;
    if (!isPlainObject(current)) {
      return { success: false, error: { type: 'INCOMPLETE_DATA' } };
    }

    const { temperature_2m, relative_humidity_2m, precipitation } = current;
    if (
      !isFiniteNumber(temperature_2m) ||
      !isFiniteNumber(relative_humidity_2m) ||
      !isFiniteNumber(precipitation)
    ) {
      return { success: false, error: { type: 'INCOMPLETE_DATA' } };
    }

    const data: WeatherData = {
      temperature: temperature_2m,
      humidity: relative_humidity_2m,
      precipitation,
    };
    return { success: true, data };
  }
}
