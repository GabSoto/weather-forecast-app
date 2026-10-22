import type { ForecastResult, GeocodingResult } from './types';
import type { WeatherRenderData } from './components/WeatherDisplay';
import {
  getForecastErrorMessage,
  getGeocodingErrorMessage,
  VALIDATION_EMPTY_MESSAGE,
} from './utils/errorMessages';

export interface GeocodingPort {
  geocode(cityName: string): Promise<GeocodingResult>;
}

export interface ForecastPort {
  getForecast(lat: number, lon: number): Promise<ForecastResult>;
}

/** Vistas que el controlador actualiza. Se tipan por interfaz para facilitar mocks. */
export interface WeatherViews {
  display: { render(data: WeatherRenderData): void; clear(): void };
  error: { show(message: string): void; clear(): void };
  loading: { show(): void; hide(): void };
  focusInput(): void;
}

/**
 * Orquesta la búsqueda: geocodificación → pronóstico → render.
 * Ante cualquier error muestra el mensaje y devuelve el foco a City_Input.
 */
export class WeatherController {
  /** Identificador de la búsqueda vigente. Las respuestas de búsquedas anteriores se descartan. */
  private requestId = 0;

  constructor(
    private readonly geocoding: GeocodingPort,
    private readonly forecast: ForecastPort,
    private readonly views: WeatherViews,
  ) {}

  async search(rawCityName: string): Promise<void> {
    const cityName = rawCityName.trim();
    if (cityName.length === 0) {
      this.views.error.show(VALIDATION_EMPTY_MESSAGE);
      this.views.focusInput();
      return;
    }

    const id = ++this.requestId;

    // Limpieza de estado previo antes de cualquier solicitud (req. 4.6).
    this.views.display.clear();
    this.views.error.clear();
    this.views.loading.show();

    try {
      const geo = await this.geocoding.geocode(cityName);
      if (id !== this.requestId) return;
      if (!geo.success) {
        this.fail(getGeocodingErrorMessage(geo.error));
        return;
      }

      const fc = await this.forecast.getForecast(geo.data.latitude, geo.data.longitude);
      if (id !== this.requestId) return;
      if (!fc.success) {
        this.fail(getForecastErrorMessage(fc.error));
        return;
      }

      this.views.display.render({
        cityName: geo.data.cityName,
        fallbackCityName: cityName,
        weather: fc.data,
      });
    } finally {
      // Solo la búsqueda vigente puede ocultar el indicador de carga.
      if (id === this.requestId) this.views.loading.hide();
    }
  }

  /**
   * Limpia resultados y errores, y cancela cualquier búsqueda en curso
   * (su respuesta tardía se descarta).
   */
  reset(): void {
    this.requestId++;
    this.views.display.clear();
    this.views.error.clear();
    this.views.loading.hide();
    this.views.focusInput();
  }

  private fail(message: string): void {
    this.views.error.show(message);
    this.views.focusInput();
  }
}
