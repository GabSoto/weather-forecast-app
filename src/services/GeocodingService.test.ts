import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { GeocodingService } from './GeocodingService';

/** Crea un servicio cuyo cliente HTTP devuelve la Response indicada. */
const serviceWith = (response: Response) => new GeocodingService(() => Promise.resolve(response));
const serviceRejecting = (err: unknown) => new GeocodingService(() => Promise.reject(err));
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
// Response no admite todos los códigos (p. ej. 304 sin cuerpo); se simula solo el estado HTTP.
const statusOnly = (status: number) => ({ ok: false, status, json: async () => ({}) }) as unknown as Response;
// JSON no conserva -0 ni infinitos: se normalizan los generadores.
const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true }).map((x) => (x === 0 ? 0 : x));

describe('GeocodingService', () => {
  // Feature: weather-forecast-app, Propiedad 4: Extracción de coordenadas del primer resultado
  it('P4: extrae latitude/longitude del primer resultado sin transformación', async () => {
    await fc.assert(
      fc.asyncProperty(
        finite(-90, 90),
        finite(-180, 180),
        fc.string(),
        async (latitude, longitude, name) => {
          const result = await serviceWith(json({ results: [{ latitude, longitude, name }] })).geocode('x');
          expect(result).toEqual({ success: true, data: { latitude, longitude, cityName: name } });
        },
      ),
    );
  });

  // Feature: weather-forecast-app, Propiedad 5: Validación de campos de coordenadas faltantes
  it('P5: latitude o longitude nulos/ausentes producen CITY_NOT_FOUND', async () => {
    await fc.assert(
      fc.asyncProperty(
        finite(-90, 90),
        finite(-180, 180),
        fc.constantFrom('latitude', 'longitude'),
        fc.constantFrom<unknown>(null, undefined),
        async (lat, lon, badKey, badValue) => {
          // undefined no se serializa en JSON: equivale a campo ausente.
          const entry: Record<string, unknown> = { name: 'X', latitude: lat, longitude: lon };
          entry[badKey] = badValue;
          const result = await serviceWith(json({ results: [entry] })).geocode('x');
          expect(result).toEqual({ success: false, error: { type: 'CITY_NOT_FOUND' } });
        },
      ),
    );
  });

  // Feature: weather-forecast-app, Propiedad 8 (Geocoding): HTTP no-2xx siempre generan error
  it('P8: cualquier estado HTTP en [300, 599] produce SERVICE_ERROR', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 300, max: 599 }), async (status) => {
        const result = await serviceWith(statusOnly(status)).geocode('x');
        expect(result).toEqual({ success: false, error: { type: 'SERVICE_ERROR', statusCode: status } });
      }),
    );
  });

  // Feature: weather-forecast-app, Propiedad 9 (Geocoding): 2xx con cuerpo inválido
  it('P9: cuerpo no JSON o no objeto produce INVALID_RESPONSE', async () => {
    const invalidBody = fc.oneof(
      fc.constant('{not json'),
      fc.integer().map((n) => String(n)),
      fc.boolean().map((b) => String(b)),
      fc.constant('null'),
      fc.array(fc.integer()).map((a) => JSON.stringify(a)),
    );
    await fc.assert(
      fc.asyncProperty(invalidBody, async (text) => {
        const result = await serviceWith(new Response(text, { status: 200 })).geocode('x');
        expect(result).toEqual({ success: false, error: { type: 'INVALID_RESPONSE' } });
      }),
    );
  });

  it('results ausente o vacío produce CITY_NOT_FOUND', async () => {
    expect(await serviceWith(json({})).geocode('x')).toEqual({
      success: false,
      error: { type: 'CITY_NOT_FOUND' },
    });
    expect(await serviceWith(json({ results: [] })).geocode('x')).toEqual({
      success: false,
      error: { type: 'CITY_NOT_FOUND' },
    });
  });

  it('error de red produce NETWORK_ERROR', async () => {
    const result = await serviceRejecting({ type: 'NETWORK_ERROR' }).geocode('x');
    expect(result).toEqual({ success: false, error: { type: 'NETWORK_ERROR' } });
  });

  it('timeout simulado produce TIMEOUT', async () => {
    const result = await serviceRejecting({ type: 'TIMEOUT' }).geocode('x');
    expect(result).toEqual({ success: false, error: { type: 'TIMEOUT' } });
  });

  it('respuesta exitosa con un resultado válido produce success: true', async () => {
    const result = await serviceWith(
      json({ results: [{ name: 'Berlin', latitude: 52.52437, longitude: 13.41053 }] }),
    ).geocode('Berlin');
    expect(result).toEqual({
      success: true,
      data: { latitude: 52.52437, longitude: 13.41053, cityName: 'Berlin' },
    });
  });
});
