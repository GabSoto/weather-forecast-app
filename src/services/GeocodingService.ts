import { requestGeocoding } from '../clients/GeocodingClient';
import { isHttpClientError } from '../clients/fetchWithTimeout';
import type { Coordinates, GeocodingResult } from '../types';

export type GeocodingRequestFn = (cityName: string) => Promise<Response>;

const notFound: GeocodingResult = { success: false, error: { type: 'CITY_NOT_FOUND' } };
const invalid: GeocodingResult = { success: false, error: { type: 'INVALID_RESPONSE' } };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Servicio de geocodificación. Orquesta la llamada al cliente HTTP y
 * valida/mapea la respuesta a Coordinates.
 */
export class GeocodingService {
  constructor(private readonly request: GeocodingRequestFn = requestGeocoding) {}

  async geocode(cityName: string): Promise<GeocodingResult> {
    let response: Response;
    try {
      response = await this.request(cityName);
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
      return invalid;
    }

    if (!isPlainObject(body)) {
      return invalid;
    }

    // results puede estar ausente o ser un array vacío: ciudad no encontrada.
    const results = body.results;
    if (results === undefined || results === null) {
      return notFound;
    }
    if (!Array.isArray(results)) {
      return invalid;
    }
    if (results.length === 0) {
      return notFound;
    }

    const first: unknown = results[0];
    if (!isPlainObject(first)) {
      return notFound;
    }

    // Latitud o longitud ausentes se tratan como cero resultados válidos (Req. 2.6).
    if (!isFiniteNumber(first.latitude) || !isFiniteNumber(first.longitude)) {
      return notFound;
    }

    const data: Coordinates = {
      latitude: first.latitude,
      longitude: first.longitude,
      cityName: typeof first.name === 'string' ? first.name : '',
    };
    return { success: true, data };
  }
}
