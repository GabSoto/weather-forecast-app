import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatTemperature, formatHumidity, formatPrecipitation } from './formatters';

// Rango acotado: toFixed usa notación exponencial para valores >= 1e21.
const value = fc.double({ min: -100, max: 100, noNaN: true, noDefaultInfinity: true });

describe('formatters', () => {
  // Feature: weather-forecast-app, Propiedad 11: Formateo numérico correcto de los valores del clima
  it('P11: temperatura y precipitación tienen como máximo 1 decimal y su unidad', () => {
    fc.assert(
      fc.property(value, (v) => {
        expect(formatTemperature(v)).toMatch(/^-?\d+(\.\d)? °C$/);
        expect(formatPrecipitation(v)).toMatch(/^-?\d+(\.\d)? mm$/);
      }),
    );
  });

  it('P11: humedad se renderiza como entero sin punto decimal', () => {
    fc.assert(
      fc.property(value, (v) => {
        const formatted = formatHumidity(v);
        expect(formatted).toMatch(/^-?\d+ %$/);
        expect(formatted).not.toContain('.');
      }),
    );
  });

  it('ejemplos concretos', () => {
    expect(formatTemperature(8.44)).toBe('8.4 °C');
    expect(formatHumidity(72.6)).toBe('73 %');
    expect(formatPrecipitation(0)).toBe('0.0 mm');
  });
});
