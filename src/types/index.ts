// Tipos y contratos del dominio (ver design.md, sección Components and Interfaces)

export interface Coordinates {
  latitude: number;
  longitude: number;
  /** Nombre retornado por la Geocoding API (puede venir vacío). */
  cityName: string;
}

export interface WeatherData {
  /** temperature_2m en °C (valor crudo) */
  temperature: number;
  /** relative_humidity_2m en % (valor crudo) */
  humidity: number;
  /** precipitation en mm (valor crudo) */
  precipitation: number;
}

export type GeocodingError =
  | { type: 'CITY_NOT_FOUND' }
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INVALID_RESPONSE' };

export type ForecastError =
  | { type: 'NETWORK_ERROR' }
  | { type: 'TIMEOUT' }
  | { type: 'SERVICE_ERROR'; statusCode: number }
  | { type: 'INCOMPLETE_DATA' }
  | { type: 'INVALID_RESPONSE' };

export type GeocodingResult =
  | { success: true; data: Coordinates }
  | { success: false; error: GeocodingError };

export type ForecastResult =
  | { success: true; data: WeatherData }
  | { success: false; error: ForecastError };

export type AppState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; cityName: string; weather: WeatherData }
  | { status: 'error'; message: string };

/** Resultado crudo del cliente HTTP: respuesta o error clasificado de red/timeout. */
export type HttpClientError = { type: 'NETWORK_ERROR' } | { type: 'TIMEOUT' };
