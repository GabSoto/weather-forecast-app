import { GeocodingService } from './services/GeocodingService';
import { ForecastService } from './services/ForecastService';
import { CitySearchForm } from './components/CitySearchForm';
import { WeatherDisplay } from './components/WeatherDisplay';
import { LoadingIndicator } from './components/LoadingIndicator';
import { ErrorMessage } from './components/ErrorMessage';
import { WeatherController, type GeocodingPort, type ForecastPort } from './WeatherController';

export interface AppDependencies {
  geocoding?: GeocodingPort;
  forecast?: ForecastPort;
}

/**
 * Monta la aplicación en el documento: crea componentes, el controlador y
 * conecta el callback onSearch del formulario con el controlador.
 * Los servicios por defecto usan los clientes HTTP reales; se pueden inyectar mocks.
 */
export function mountApp(doc: Document, deps: AppDependencies = {}): WeatherController {
  const root = (id: string): HTMLElement => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`Elemento #${id} no encontrado`);
    return el;
  };

  const geocoding = deps.geocoding ?? new GeocodingService();
  const forecast = deps.forecast ?? new ForecastService();

  const loading = new LoadingIndicator(root('loading-root'));
  const error = new ErrorMessage(root('error-root'));
  const display = new WeatherDisplay(root('weather-root'));

  let controller: WeatherController | undefined;
  const form = new CitySearchForm(
    root('search-form-root'),
    (cityName) => {
      void controller?.search(cityName);
    },
    () => controller?.reset(),
  );

  controller = new WeatherController(geocoding, forecast, {
    display,
    error,
    loading,
    focusInput: () => form.focusInput(),
  });

  return controller;
}
