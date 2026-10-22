import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildForecastUrl, requestForecast, FORECAST_BASE_URL } from './ForecastClient';

describe('ForecastClient', () => {
  // Feature: weather-forecast-app, Propiedad 6: Construcción correcta de la URL de Pronóstico
  it('P6: la URL contiene latitude, longitude y las tres variables de current', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat, lon) => {
          const url = new URL(buildForecastUrl(lat, lon));
          expect(url.origin + url.pathname).toBe(FORECAST_BASE_URL);
          // Comparación con === para tolerar -0 (String(-0) === "0").
          expect(Number(url.searchParams.get('latitude')) === lat).toBe(true);
          expect(Number(url.searchParams.get('longitude')) === lon).toBe(true);
          const current = (url.searchParams.get('current') ?? '').split(',');
          expect(current).toEqual(
            expect.arrayContaining(['temperature_2m', 'relative_humidity_2m', 'precipitation']),
          );
        },
      ),
    );
  });

  it('clasifica AbortError como TIMEOUT', async () => {
    const fetchFn = () => Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(requestForecast(52.52, 13.41, fetchFn)).rejects.toEqual({ type: 'TIMEOUT' });
  });

  it('clasifica TypeError de fetch como NETWORK_ERROR', async () => {
    const fetchFn = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(requestForecast(52.52, 13.41, fetchFn)).rejects.toEqual({ type: 'NETWORK_ERROR' });
  });
});
