import type { WeatherData } from '../types';
import { formatHumidity, formatPrecipitation, formatTemperature } from '../utils/formatters';

export interface WeatherRenderData {
  /** Nombre devuelto por la Geocoding API (puede estar vacío). */
  cityName: string;
  /** Nombre ingresado por el usuario; se usa si cityName está vacío (req. 4.7). */
  fallbackCityName: string;
  weather: WeatherData;
}

/** Muestra los datos del clima. Usa textContent para no interpretar HTML del usuario. */
export class WeatherDisplay {
  constructor(private readonly container: HTMLElement) {}

  render({ cityName, fallbackCityName, weather }: WeatherRenderData): void {
    const doc = this.container.ownerDocument;
    const displayName = cityName.trim().length > 0 ? cityName : fallbackCityName;

    const title = doc.createElement('h2');
    title.textContent = displayName;

    const list = doc.createElement('dl');
    list.className = 'weather-values';
    list.append(
      this.item(doc, 'Temperatura', formatTemperature(weather.temperature)),
      this.item(doc, 'Humedad', formatHumidity(weather.humidity)),
      this.item(doc, 'Precipitación', formatPrecipitation(weather.precipitation)),
    );

    this.container.replaceChildren(title, list);
  }

  clear(): void {
    this.container.replaceChildren();
  }

  private item(doc: Document, term: string, value: string): HTMLElement {
    const wrapper = doc.createElement('div');
    const dt = doc.createElement('dt');
    dt.textContent = term;
    const dd = doc.createElement('dd');
    dd.textContent = value;
    wrapper.append(dt, dd);
    return wrapper;
  }
}
