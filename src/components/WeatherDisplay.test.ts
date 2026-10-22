import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WeatherDisplay } from './WeatherDisplay';
import { formatTemperature, formatHumidity, formatPrecipitation } from '../utils/formatters';
import type { WeatherData } from '../types';

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  container = document.getElementById('root') as HTMLElement;
});

const cityName = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);
const weather = fc.record({
  temperature: fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true }),
  humidity: fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
  precipitation: fc.double({ min: 0, max: 500, noNaN: true, noDefaultInfinity: true }),
}) satisfies fc.Arbitrary<WeatherData>;

describe('WeatherDisplay', () => {
  // Feature: weather-forecast-app, Propiedad 12: Weather_Display contiene todos los campos con sus unidades
  it('P12: muestra ciudad, temperatura °C, humedad % y precipitación mm', () => {
    fc.assert(
      fc.property(cityName, weather, (name, w) => {
        const display = new WeatherDisplay(container);
        display.render({ cityName: name, fallbackCityName: 'otro', weather: w });
        const text = container.textContent ?? '';
        expect(text).toContain(name);
        expect(text).toContain(formatTemperature(w.temperature));
        expect(text).toContain(formatHumidity(w.humidity));
        expect(text).toContain(formatPrecipitation(w.precipitation));
        expect(formatTemperature(w.temperature).endsWith('°C')).toBe(true);
        expect(formatHumidity(w.humidity).endsWith('%')).toBe(true);
        expect(formatPrecipitation(w.precipitation).endsWith('mm')).toBe(true);
        container.replaceChildren();
      }),
    );
  });

  // Feature: weather-forecast-app, Propiedad 13: Limpieza del Weather_Display al iniciar nueva búsqueda
  it('P13: clear() deja el display vacío sin importar el estado previo', () => {
    fc.assert(
      fc.property(cityName, weather, fc.integer({ min: 0, max: 3 }), (name, w, previousRenders) => {
        const display = new WeatherDisplay(container);
        for (let i = 0; i < previousRenders; i++) {
          display.render({ cityName: name, fallbackCityName: name, weather: w });
        }
        display.clear();
        expect(container.children.length).toBe(0);
        expect(container.textContent).toBe('');
        container.replaceChildren();
      }),
    );
  });

  it('usa el nombre ingresado por el usuario si cityName llega vacío (req. 4.7)', () => {
    const display = new WeatherDisplay(container);
    display.render({
      cityName: '',
      fallbackCityName: 'Berlín',
      weather: { temperature: 8.4, humidity: 72, precipitation: 0 },
    });
    expect(container.querySelector('h2')?.textContent).toBe('Berlín');
  });
});
