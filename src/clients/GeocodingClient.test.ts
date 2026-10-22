import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildGeocodingUrl, requestGeocoding, GEOCODING_BASE_URL } from './GeocodingClient';

describe('GeocodingClient', () => {
  // Feature: weather-forecast-app, Propiedad 3: Construcción correcta de la URL de Geocodificación
  it('P3: la URL contiene name URL-encoded y count=1 para cualquier nombre no vacío', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (cityName) => {
        const url = new URL(buildGeocodingUrl(cityName));
        expect(url.origin + url.pathname).toBe(GEOCODING_BASE_URL);
        expect(url.searchParams.get('name')).toBe(cityName);
        expect(url.searchParams.get('count')).toBe('1');
      }),
    );
  });

  it('usa el endpoint de Open-Meteo y codifica espacios en el nombre', () => {
    const url = new URL(buildGeocodingUrl('San José'));
    expect(url.hostname).toBe('geocoding-api.open-meteo.com');
    expect(url.searchParams.get('name')).toBe('San José');
  });

  it('clasifica AbortError como TIMEOUT', async () => {
    const fetchFn = () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(requestGeocoding('Berlin', fetchFn)).rejects.toEqual({ type: 'TIMEOUT' });
  });

  it('clasifica TypeError de fetch como NETWORK_ERROR', async () => {
    const fetchFn = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(requestGeocoding('Berlin', fetchFn)).rejects.toEqual({ type: 'NETWORK_ERROR' });
  });

  it('devuelve la Response con estado y cuerpo cuando fetch resuelve', async () => {
    const fetchFn = () => Promise.resolve(new Response('{"results":[]}', { status: 200 }));
    const res = await requestGeocoding('Berlin', fetchFn);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ results: [] });
  });
});
