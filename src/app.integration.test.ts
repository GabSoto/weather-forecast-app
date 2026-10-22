import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountApp } from './app';
import { GeocodingService } from './services/GeocodingService';
import { ForecastService } from './services/ForecastService';

const BODY = `
  <main>
    <h1>Pronóstico del clima</h1>
    <div id="search-form-root"></div>
    <div id="loading-root" aria-live="polite"></div>
    <div id="error-root" role="alert"></div>
    <section id="weather-root" aria-live="polite"></section>
  </main>`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Espera a que la búsqueda en curso termine (el submit dispara una promesa interna). */
const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(geoRequest: (name: string) => Promise<Response>, forecastRequest: (lat: number, lon: number) => Promise<Response>) {
  document.body.innerHTML = BODY;
  mountApp(document, {
    geocoding: new GeocodingService(geoRequest),
    forecast: new ForecastService(forecastRequest),
  });
  return {
    input: document.getElementById('city-input') as HTMLInputElement,
    form: document.querySelector('form') as HTMLFormElement,
  };
}

async function search(form: HTMLFormElement, input: HTMLInputElement, value: string): Promise<void> {
  input.value = value;
  form.requestSubmit();
  // Varias vueltas del event loop para que terminen las promesas encadenadas del flujo.
  for (let i = 0; i < 5; i++) await flush();
}

describe('integración extremo a extremo', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('flujo exitoso: búsqueda → geocoding → forecast → datos visibles en el DOM', async () => {
    const { input, form } = setup(
      () => Promise.resolve(json({ results: [{ name: 'Berlin', latitude: 52.52, longitude: 13.41 }] })),
      () => Promise.resolve(json({ current: { temperature_2m: 8.44, relative_humidity_2m: 72.4, precipitation: 0 } })),
    );

    await search(form, input, 'Berlin');

    expect(document.querySelector('#weather-root h2')?.textContent).toBe('Berlin');
    const text = document.getElementById('weather-root')?.textContent ?? '';
    expect(text).toContain('8.4 °C');
    expect(text).toContain('72 %');
    expect(text).toContain('0.0 mm');
    expect((document.getElementById('loading-root')?.querySelector('p') as HTMLElement).hidden).toBe(true);
  });

  it('flujo de error: geocoding falla → mensaje visible y City_Input accesible', async () => {
    const forecast = vi.fn(() => Promise.resolve(json({})));
    const { input, form } = setup(() => Promise.resolve(new Response('', { status: 500 })), forecast);

    await search(form, input, 'Berlin');

    expect(document.getElementById('error-root')?.textContent).toBe(
      'El servicio de geocodificación retornó un error.',
    );
    expect(forecast).not.toHaveBeenCalled();
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('ciudad no encontrada muestra el mensaje correspondiente', async () => {
    const { input, form } = setup(
      () => Promise.resolve(json({})),
      () => Promise.resolve(json({})),
    );
    await search(form, input, 'Xyzzy');
    expect(document.getElementById('error-root')?.textContent).toContain('No se encontró la ciudad');
  });

  it('fallback de nombre de ciudad (req. 4.7): si la API no devuelve name, se muestra lo ingresado', async () => {
    const { input, form } = setup(
      () => Promise.resolve(json({ results: [{ latitude: 52.52, longitude: 13.41 }] })),
      () => Promise.resolve(json({ current: { temperature_2m: 1, relative_humidity_2m: 2, precipitation: 0 } })),
    );
    await search(form, input, '  Berlín  ');
    expect(document.querySelector('#weather-root h2')?.textContent).toBe('Berlín');
  });

  it('una nueva búsqueda limpia el resultado y el error anteriores', async () => {
    let call = 0;
    const { input, form } = setup(
      () => {
        call++;
        return Promise.resolve(
          call === 1
            ? json({ results: [{ name: 'Berlin', latitude: 52.52, longitude: 13.41 }] })
            : json({ results: [] }),
        );
      },
      () => Promise.resolve(json({ current: { temperature_2m: 1, relative_humidity_2m: 2, precipitation: 0 } })),
    );

    await search(form, input, 'Berlin');
    expect(document.querySelector('#weather-root h2')).not.toBeNull();

    await search(form, input, 'Xyzzy');
    expect(document.querySelector('#weather-root h2')).toBeNull();
    expect(document.getElementById('error-root')?.textContent).toContain('No se encontró la ciudad');
  });

  it('Limpiar tras un resultado vacía input, resultados y errores', async () => {
    const { input, form } = setup(
      () => Promise.resolve(json({ results: [{ name: 'Berlin', latitude: 52.52, longitude: 13.41 }] })),
      () => Promise.resolve(json({ current: { temperature_2m: 1, relative_humidity_2m: 2, precipitation: 0 } })),
    );
    await search(form, input, 'Berlin');
    expect(document.querySelector('#weather-root h2')).not.toBeNull();

    (document.querySelector('button[type="button"]') as HTMLButtonElement).click();
    await flush();

    expect(input.value).toBe('');
    expect(document.querySelector('#weather-root h2')).toBeNull();
    expect(document.getElementById('error-root')?.textContent).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('entrada vacía muestra validación inline y no hace solicitudes', async () => {
    const geo = vi.fn(() => Promise.resolve(json({})));
    const { input, form } = setup(geo, () => Promise.resolve(json({})));
    await search(form, input, '   ');
    expect(geo).not.toHaveBeenCalled();
    expect(document.getElementById('city-validation')?.textContent).toBe(
      'El nombre de la ciudad es obligatorio.',
    );
  });
});
