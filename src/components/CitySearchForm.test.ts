import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { CitySearchForm, CITY_INPUT_MAX_LENGTH } from './CitySearchForm';
import { VALIDATION_EMPTY_MESSAGE } from '../utils/errorMessages';

// fast-check v4 no tiene fc.stringOf: se construye desde un array de caracteres de espacio.
const whitespace = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'))
  .map((chars) => chars.join(''));

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  container = document.getElementById('root') as HTMLElement;
});

/** Escribe el valor y envía el formulario (equivale a clic en el botón o Enter). */
function submitWith(form: CitySearchForm, value: string): void {
  form.input.value = value;
  form.input.form!.requestSubmit();
}

describe('CitySearchForm', () => {
  // Feature: weather-forecast-app, Propiedad 1: Rechazo de entradas de solo whitespace
  it('P1: whitespace (incluido vacío) no invoca onSearch y muestra validación', () => {
    fc.assert(
      fc.property(whitespace, (value) => {
        const onSearch = vi.fn();
        const form = new CitySearchForm(container, onSearch);
        submitWith(form, value);
        expect(onSearch).not.toHaveBeenCalled();
        expect(container.querySelector('#city-validation')?.textContent).toBe(VALIDATION_EMPTY_MESSAGE);
        container.replaceChildren();
      }),
    );
  });

  // Feature: weather-forecast-app, Propiedad 2: Trim del nombre de ciudad antes de enviar
  it('P2: onSearch recibe exactamente el valor recortado', () => {
    const core = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);
    fc.assert(
      fc.property(whitespace, core, whitespace, (pre, middle, post) => {
        const onSearch = vi.fn();
        const form = new CitySearchForm(container, onSearch);
        submitWith(form, pre + middle + post);
        // El input de texto normaliza saltos de línea; se compara con el valor real del campo.
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith(form.input.value.trim());
        container.replaceChildren();
      }),
    );
  });

  it('renderiza City_Input con maxlength=100 y botón de envío', () => {
    new CitySearchForm(container, vi.fn());
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.maxLength).toBe(CITY_INPUT_MAX_LENGTH);
    expect(input.maxLength).toBe(100);
    expect(container.querySelector('button[type="submit"]')).not.toBeNull();
  });

  it('envío con clic en el botón invoca onSearch una vez', () => {
    const onSearch = vi.fn();
    new CitySearchForm(container, onSearch);
    const input = container.querySelector('input') as HTMLInputElement;
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    input.value = '  Berlin ';
    button.click();
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Berlin');
  });

  it('un único submit (equivalente a Enter en el campo) invoca onSearch una sola vez', () => {
    const onSearch = vi.fn();
    new CitySearchForm(container, onSearch);
    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'Madrid';
    input.focus();
    input.form!.requestSubmit();
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('Madrid');
  });

  it('City_Input permanece accesible (habilitado y enfocable) después de un error', () => {
    const onSearch = vi.fn();
    const form = new CitySearchForm(container, onSearch);
    submitWith(form, '   ');
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(document.activeElement).toBe(input);
  });

  it('botón Limpiar vacía el input y la validación, devuelve el foco y notifica onClear', () => {
    const onSearch = vi.fn();
    const onClear = vi.fn();
    const form = new CitySearchForm(container, onSearch, onClear);
    submitWith(form, '   ');
    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'Berlin';

    const clearButton = container.querySelector('button[type="button"]') as HTMLButtonElement;
    expect(clearButton.textContent).toBe('Limpiar');
    clearButton.click();

    expect(input.value).toBe('');
    expect(container.querySelector('#city-validation')?.textContent).toBe('');
    expect(document.activeElement).toBe(input);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('botón Limpiar no envía el formulario', () => {
    const onSearch = vi.fn();
    new CitySearchForm(container, onSearch, vi.fn());
    const clearButton = container.querySelector('button[type="button"]') as HTMLButtonElement;
    clearButton.click();
    expect(onSearch).not.toHaveBeenCalled();
  });
});
