import type { ForecastError, GeocodingError } from '../types';

// Textos según la tabla "Clasificación de Errores" de design.md.

export const VALIDATION_EMPTY_MESSAGE = 'El nombre de la ciudad es obligatorio.';

export function getGeocodingErrorMessage(error: GeocodingError): string {
  switch (error.type) {
    case 'CITY_NOT_FOUND':
      return 'No se encontró la ciudad ingresada. Verifica el nombre e intenta de nuevo.';
    case 'NETWORK_ERROR':
      return 'El servicio de geocodificación no está disponible. Verifica tu conexión.';
    case 'TIMEOUT':
      return 'El servicio de geocodificación no respondió a tiempo.';
    case 'SERVICE_ERROR':
      return 'El servicio de geocodificación retornó un error.';
    case 'INVALID_RESPONSE':
      return 'Los datos recibidos del servicio de geocodificación no son válidos.';
  }
}

export function getForecastErrorMessage(error: ForecastError): string {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return 'El servicio de pronóstico no está disponible. Verifica tu conexión.';
    case 'TIMEOUT':
      return 'El servicio de pronóstico no respondió a tiempo.';
    case 'SERVICE_ERROR':
      return 'El servicio de pronóstico retornó un error.';
    case 'INCOMPLETE_DATA':
      return 'Los datos meteorológicos recibidos están incompletos.';
    case 'INVALID_RESPONSE':
      return 'Los datos recibidos del servicio de pronóstico no son válidos.';
  }
}
