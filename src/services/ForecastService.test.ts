import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ForecastService } from './ForecastService';

const serviceWith = (response: Response) => new ForecastService(() => Promise.resolve(response));
const serviceRejecting = (err: unknown) => new ForecastService(() => Promise.reject(err));
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
// Response no admite todos los códigos (p. ej. 304 sin cuerpo); se simula solo el estado HTTP.
const statusOnly = (status: number) => ({ ok: false, status, json: async () => ({}) }) as unknown as Response;
// JSON no conserva -0 ni infinitos: se normalizan los generadores.
const finite = fc.double({ noNaN: true, noDefaultInfinity: true }).map((x) => (x === 0 ? 0 : x));

describe('ForecastService', () => {
  // Feature: weather-forecast-app, Propiedad 7: Round-trip de parseo Forecast → WeatherData
  it('P7: los valores de WeatherData son numéricamente iguales al JSON crudo', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          temperature_2m: finite,
          relative_humidity_2m: finite,
          precipitation: finite,
        }),
        async (current) => {
          const result = await serviceWith(json({ current })).getForecast(0, 0);
          expect(result).toEqual({
            success: true,
            data: {
              temperature: current.temperature_2m,
              humidity: current.relative_humidity_2m,
              precipitation: current.precipitation,
            },
          });
        },
      ),
    );
  });

  // Feature: weather-forecast-app, Propiedad 10: Campos meteorológicos faltantes → INCOMPLETE_DATA
  it('P10: al menos un campo de current nulo/ausente produce INCOMPLETE_DATA', async () => {
    const fields = ['temperature_2m', 'relative_humidity_2m', 'precipitation'] as const;
    const badValue = fc.oneof(fc.constant(null), fc.constant(undefined));
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          finite,
          finite,
          finite,
          fc.integer({ min: 0, max: 2 }),
          fc.boolean(),
          badValue,
        ),
        async ([t, h, p, idx, omit, bad]) => {
          const current: Record<string, unknown> = {
            temperature_2m: t,
            relative_humidity_2m: h,
            precipitation: p,
          };
          const key = fields[idx];
          if (omit) {
            delete current[key];
          } else {
            current[key] = bad;
          }
          const result = await serviceWith(json({ current })).getForecast(0, 0);
          expect(result).toEqual({ success: false, error: { type: 'INCOMPLETE_DATA' } });
        },
      ),
    );
  });

  // Feature: weather-forecast-app, Propiedad 8 (Forecast): HTTP no-2xx siempre generan error
  it('P8: cualquier estado HTTP en [300, 599] produce SERVICE_ERROR', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 300, max: 599 }), async (status) => {
        const result = await serviceWith(statusOnly(status)).getForecast(0, 0);
        expect(result).toEqual({ success: false, error: { type: 'SERVICE_ERROR', statusCode: status } });
      }),
    );
  });

  // Feature: weather-forecast-app, Propiedad 9 (Forecast): 2xx con cuerpo inválido
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
        const result = await serviceWith(new Response(text, { status: 200 })).getForecast(0, 0);
        expect(result).toEqual({ success: false, error: { type: 'INVALID_RESPONSE' } });
      }),
    );
  });

  it('error de red produce NETWORK_ERROR', async () => {
    const result = await serviceRejecting({ type: 'NETWORK_ERROR' }).getForecast(0, 0);
    expect(result).toEqual({ success: false, error: { type: 'NETWORK_ERROR' } });
  });

  it('timeout simulado produce TIMEOUT', async () => {
    const result = await serviceRejecting({ type: 'TIMEOUT' }).getForecast(0, 0);
    expect(result).toEqual({ success: false, error: { type: 'TIMEOUT' } });
  });

  it('respuesta exitosa con todos los campos produce success: true', async () => {
    const result = await serviceWith(
      json({ current: { temperature_2m: 8.4, relative_humidity_2m: 72, precipitation: 0 } }),
    ).getForecast(52.52, 13.41);
    expect(result).toEqual({ success: true, data: { temperature: 8.4, humidity: 72, precipitation: 0 } });
  });

  it('respuesta sin objeto current produce INCOMPLETE_DATA', async () => {
    const result = await serviceWith(json({ latitude: 52.52 })).getForecast(52.52, 13.41);
    expect(result).toEqual({ success: false, error: { type: 'INCOMPLETE_DATA' } });
  });
});
