import { describe, it, expect } from 'vitest';
import {
  getGeocodingErrorMessage,
  getForecastErrorMessage,
  VALIDATION_EMPTY_MESSAGE,
} from './errorMessages';

describe('errorMessages', () => {
  it('mapea cada error de geocodificación a su mensaje', () => {
    expect(getGeocodingErrorMessage({ type: 'CITY_NOT_FOUND' })).toContain('No se encontró la ciudad');
    expect(getGeocodingErrorMessage({ type: 'NETWORK_ERROR' })).toContain('geocodificación no está disponible');
    expect(getGeocodingErrorMessage({ type: 'TIMEOUT' })).toContain('geocodificación no respondió a tiempo');
    expect(getGeocodingErrorMessage({ type: 'SERVICE_ERROR', statusCode: 500 })).toContain('geocodificación retornó un error');
    expect(getGeocodingErrorMessage({ type: 'INVALID_RESPONSE' })).toContain('geocodificación no son válidos');
  });

  it('mapea cada error de pronóstico a su mensaje', () => {
    expect(getForecastErrorMessage({ type: 'NETWORK_ERROR' })).toContain('pronóstico no está disponible');
    expect(getForecastErrorMessage({ type: 'TIMEOUT' })).toContain('pronóstico no respondió a tiempo');
    expect(getForecastErrorMessage({ type: 'SERVICE_ERROR', statusCode: 503 })).toContain('pronóstico retornó un error');
    expect(getForecastErrorMessage({ type: 'INCOMPLETE_DATA' })).toContain('incompletos');
    expect(getForecastErrorMessage({ type: 'INVALID_RESPONSE' })).toContain('pronóstico no son válidos');
  });

  it('expone el mensaje de validación de entrada vacía', () => {
    expect(VALIDATION_EMPTY_MESSAGE).toBe('El nombre de la ciudad es obligatorio.');
  });
});
