import { describe, it, expect } from 'vitest';
import { fetchWithTimeout, FORECAST_TIMEOUT_MS, REQUEST_TIMEOUT_MS } from './fetchWithTimeout';

describe('fetchWithTimeout', () => {
  it('Forecast usa 30 s y Geocoding mantiene 10 s', () => {
    expect(FORECAST_TIMEOUT_MS).toBe(30_000);
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  it('vence si la respuesta no llega a tiempo', async () => {
    const fetchFn = () => new Promise<Response>(() => {});
    await expect(fetchWithTimeout('http://x', fetchFn, 20)).rejects.toEqual({ type: 'TIMEOUT' });
  });

  it('vence si el cuerpo no termina de llegar a tiempo', async () => {
    const fetchFn = () =>
      Promise.resolve(new Response(new ReadableStream({ start() {} }), { status: 200 }));
    await expect(fetchWithTimeout('http://x', fetchFn, 20)).rejects.toEqual({ type: 'TIMEOUT' });
  });

  it('conserva el estado HTTP y el cuerpo cuando responde a tiempo', async () => {
    const fetchFn = () => Promise.resolve(new Response('{"a":1}', { status: 503 }));
    const res = await fetchWithTimeout('http://x', fetchFn, 1000);
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ a: 1 });
  });

  it('maneja estados sin cuerpo (304) sin lanzar', async () => {
    const fetchFn = () => Promise.resolve({ status: 304, statusText: '', headers: new Headers(), text: async () => '' } as unknown as Response);
    const res = await fetchWithTimeout('http://x', fetchFn, 1000);
    expect(res.status).toBe(304);
  });

  it('clasifica un TypeError de red como NETWORK_ERROR', async () => {
    const fetchFn = () => Promise.reject(new TypeError('Failed to fetch'));
    await expect(fetchWithTimeout('http://x', fetchFn, 1000)).rejects.toEqual({ type: 'NETWORK_ERROR' });
  });
});
