import type { HttpClientError } from '../types';

/** Timeout para la Geocoding API (requisito 2.4). */
export const REQUEST_TIMEOUT_MS = 10_000;

/** Timeout para la Forecast API. Ampliado de 10 s a 30 s porque la API tardó ~15 s en pruebas reales. */
export const FORECAST_TIMEOUT_MS = 30_000;

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Estados HTTP que no admiten cuerpo en el constructor de Response. */
const NULL_BODY_STATUSES = new Set([101, 103, 204, 205, 304]);

/**
 * Ejecuta fetch con timeout que cubre tanto la respuesta como la lectura del cuerpo.
 * - Vencido el plazo → { type: 'TIMEOUT' }
 * - Rechazo de fetch (TypeError de red) u otro fallo de transporte → { type: 'NETWORK_ERROR' }
 * Resuelve con una Response reconstruida con el cuerpo ya leído; el estado HTTP
 * no se evalúa aquí (eso es responsabilidad del servicio).
 */
export async function fetchWithTimeout(
  url: string,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject({ type: 'TIMEOUT' } satisfies HttpClientError);
    }, timeoutMs);
  });

  const request = async (): Promise<Response> => {
    const res = await fetchFn(url, { signal: controller.signal });
    const text = await res.text();
    return new Response(NULL_BODY_STATUSES.has(res.status) ? null : text, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  };

  try {
    return await Promise.race([request(), timeout]);
  } catch (err) {
    if (isHttpClientError(err)) throw err;
    const classified: HttpClientError =
      err instanceof Error && err.name === 'AbortError'
        ? { type: 'TIMEOUT' }
        : { type: 'NETWORK_ERROR' };
    throw classified;
  } finally {
    clearTimeout(timer);
  }
}

/** Type guard para errores clasificados por fetchWithTimeout. */
export function isHttpClientError(err: unknown): err is HttpClientError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    ((err as { type: unknown }).type === 'TIMEOUT' ||
      (err as { type: unknown }).type === 'NETWORK_ERROR')
  );
}
