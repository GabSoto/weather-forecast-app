import { describe, it, expect, vi } from 'vitest';
import { WeatherController, type WeatherViews, type GeocodingPort, type ForecastPort } from './WeatherController';
import { VALIDATION_EMPTY_MESSAGE } from './utils/errorMessages';

function makeViews(): WeatherViews & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    display: {
      render: vi.fn(() => calls.push('display.render')),
      clear: vi.fn(() => calls.push('display.clear')),
    },
    error: {
      show: vi.fn(() => calls.push('error.show')),
      clear: vi.fn(() => calls.push('error.clear')),
    },
    loading: {
      show: vi.fn(() => calls.push('loading.show')),
      hide: vi.fn(() => calls.push('loading.hide')),
    },
    focusInput: vi.fn(() => calls.push('focusInput')),
  };
}

const okGeo = (): GeocodingPort => ({
  geocode: vi.fn().mockResolvedValue({
    success: true,
    data: { latitude: 52.52, longitude: 13.41, cityName: 'Berlin' },
  }),
});
const okForecast = (): ForecastPort => ({
  getForecast: vi.fn().mockResolvedValue({
    success: true,
    data: { temperature: 8.4, humidity: 72, precipitation: 0 },
  }),
});

describe('WeatherController', () => {
  it('flujo exitoso: geocodificación → pronóstico → display renderizado', async () => {
    const views = makeViews();
    const geo = okGeo();
    const fc = okForecast();
    await new WeatherController(geo, fc, views).search(' Berlin ');

    expect(geo.geocode).toHaveBeenCalledWith('Berlin');
    expect(fc.getForecast).toHaveBeenCalledWith(52.52, 13.41);
    expect(views.display.render).toHaveBeenCalledWith({
      cityName: 'Berlin',
      fallbackCityName: 'Berlin',
      weather: { temperature: 8.4, humidity: 72, precipitation: 0 },
    });
    expect(views.error.show).not.toHaveBeenCalled();
  });

  it('el display se limpia antes de que responda ForecastService (req. 4.6)', async () => {
    const views = makeViews();
    let resolveForecast: (v: unknown) => void = () => {};
    const getForecast = vi.fn(() => new Promise((resolve) => (resolveForecast = resolve)));
    const fc = { getForecast } as unknown as ForecastPort;
    const pending = new WeatherController(okGeo(), fc, views).search('Berlin');

    // Mientras el pronóstico está pendiente, el display ya fue limpiado y aún no se renderizó.
    await vi.waitFor(() => expect(getForecast).toHaveBeenCalled());
    expect(views.calls).toContain('display.clear');
    expect(views.display.render).not.toHaveBeenCalled();

    resolveForecast({ success: true, data: { temperature: 1, humidity: 1, precipitation: 0 } });
    await pending;
    expect(views.calls.indexOf('display.clear')).toBeLessThan(views.calls.indexOf('display.render'));
  });

  it('GeocodingService CITY_NOT_FOUND → mensaje correcto y foco en City_Input', async () => {
    const views = makeViews();
    const geo: GeocodingPort = {
      geocode: vi.fn().mockResolvedValue({ success: false, error: { type: 'CITY_NOT_FOUND' } }),
    };
    const fc = okForecast();
    await new WeatherController(geo, fc, views).search('Xyzzy');

    expect(fc.getForecast).not.toHaveBeenCalled();
    expect(views.error.show).toHaveBeenCalledWith(expect.stringContaining('No se encontró la ciudad'));
    expect(views.focusInput).toHaveBeenCalled();
  });

  it('ForecastService INCOMPLETE_DATA → mensaje correcto en ErrorMessage', async () => {
    const views = makeViews();
    const fc: ForecastPort = {
      getForecast: vi.fn().mockResolvedValue({ success: false, error: { type: 'INCOMPLETE_DATA' } }),
    };
    await new WeatherController(okGeo(), fc, views).search('Berlin');

    expect(views.error.show).toHaveBeenCalledWith('Los datos meteorológicos recibidos están incompletos.');
    expect(views.display.render).not.toHaveBeenCalled();
  });

  it('indicador de carga aparece al iniciar y se oculta al completar (éxito)', async () => {
    const views = makeViews();
    const pending = new WeatherController(okGeo(), okForecast(), views).search('Berlin');
    expect(views.loading.show).toHaveBeenCalledTimes(1);
    await pending;
    expect(views.loading.hide).toHaveBeenCalledTimes(1);
    expect(views.calls.at(-1)).toBe('loading.hide');
  });

  it('indicador de carga se oculta al completar (error)', async () => {
    const views = makeViews();
    const geo: GeocodingPort = {
      geocode: vi.fn().mockResolvedValue({ success: false, error: { type: 'TIMEOUT' } }),
    };
    await new WeatherController(geo, okForecast(), views).search('Berlin');
    expect(views.loading.show).toHaveBeenCalledTimes(1);
    expect(views.loading.hide).toHaveBeenCalledTimes(1);
  });

  it('entrada vacía o solo espacios: no llama a los servicios y muestra validación', async () => {
    const views = makeViews();
    const geo = okGeo();
    await new WeatherController(geo, okForecast(), views).search('   ');
    expect(geo.geocode).not.toHaveBeenCalled();
    expect(views.error.show).toHaveBeenCalledWith(VALIDATION_EMPTY_MESSAGE);
  });

  it('reset() limpia display, error y carga, y devuelve el foco', () => {
    const views = makeViews();
    new WeatherController(okGeo(), okForecast(), views).reset();
    expect(views.display.clear).toHaveBeenCalled();
    expect(views.error.clear).toHaveBeenCalled();
    expect(views.loading.hide).toHaveBeenCalled();
    expect(views.focusInput).toHaveBeenCalled();
  });

  it('reset() durante una búsqueda pendiente descarta el resultado tardío', async () => {
    const views = makeViews();
    let resolveForecast: (v: unknown) => void = () => {};
    const getForecast = vi.fn(() => new Promise((resolve) => (resolveForecast = resolve)));
    const controller = new WeatherController(okGeo(), { getForecast } as unknown as ForecastPort, views);

    const pending = controller.search('Berlin');
    await vi.waitFor(() => expect(getForecast).toHaveBeenCalled());
    controller.reset();

    resolveForecast({ success: true, data: { temperature: 1, humidity: 1, precipitation: 0 } });
    await pending;
    expect(views.display.render).not.toHaveBeenCalled();
    expect(views.error.show).not.toHaveBeenCalled();
  });

  it('una búsqueda obsoleta no oculta el indicador de carga de la vigente', async () => {
    const views = makeViews();
    const resolvers: Array<(v: unknown) => void> = [];
    const geo = {
      geocode: vi.fn(() => new Promise((resolve) => resolvers.push(resolve))),
    } as unknown as GeocodingPort;
    const controller = new WeatherController(geo, okForecast(), views);

    const first = controller.search('Berlin');
    await vi.waitFor(() => expect(resolvers.length).toBe(1));
    const second = controller.search('Madrid');
    await vi.waitFor(() => expect(resolvers.length).toBe(2));

    resolvers[0]({ success: false, error: { type: 'CITY_NOT_FOUND' } });
    await first;
    expect(views.loading.hide).not.toHaveBeenCalled();
    expect(views.error.show).not.toHaveBeenCalled();

    resolvers[1]({ success: false, error: { type: 'CITY_NOT_FOUND' } });
    await second;
    expect(views.loading.hide).toHaveBeenCalledTimes(1);
  });
});
