import { VALIDATION_EMPTY_MESSAGE } from '../utils/errorMessages';

export const CITY_INPUT_MAX_LENGTH = 100;

/**
 * Formulario de búsqueda. Solo escucha el evento `submit` del <form>:
 * el botón de envío y la tecla Enter lo disparan de forma nativa, por lo que
 * no se añade un listener keydown (evita la doble búsqueda).
 */
export class CitySearchForm {
  private readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  private readonly validation: HTMLElement;

  constructor(
    container: HTMLElement,
    private readonly onSearch: (cityName: string) => void,
    private readonly onClear: () => void = () => {},
  ) {
    const doc = container.ownerDocument;

    this.form = doc.createElement('form');
    this.form.noValidate = true;
    this.form.setAttribute('aria-label', 'Buscar ciudad');

    const label = doc.createElement('label');
    label.htmlFor = 'city-input';
    label.textContent = 'Nombre de la ciudad';

    this.input = doc.createElement('input');
    this.input.id = 'city-input';
    this.input.type = 'text';
    this.input.name = 'city';
    this.input.maxLength = CITY_INPUT_MAX_LENGTH;
    this.input.autocomplete = 'off';
    this.input.setAttribute('aria-describedby', 'city-validation');

    const searchButton = doc.createElement('button');
    searchButton.type = 'submit';
    searchButton.className = 'btn-primary';
    searchButton.textContent = 'Buscar';

    const clearButton = doc.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'btn-secondary';
    clearButton.textContent = 'Limpiar';

    const actions = doc.createElement('div');
    actions.className = 'actions';
    actions.append(searchButton, clearButton);

    this.validation = doc.createElement('p');
    this.validation.id = 'city-validation';
    this.validation.className = 'field-error';
    this.validation.setAttribute('role', 'alert');

    this.form.append(label, this.input, actions, this.validation);
    container.replaceChildren(this.form);

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSubmit();
    });

    clearButton.addEventListener('click', () => this.clear());
  }

  /** Vacía el campo y la validación, y notifica al controlador para limpiar resultados. */
  clear(): void {
    this.input.value = '';
    this.clearValidation();
    this.input.focus();
    this.onClear();
  }

  private handleSubmit(): void {
    const cityName = this.input.value.trim();
    if (cityName.length === 0) {
      this.showValidation(VALIDATION_EMPTY_MESSAGE);
      this.input.focus();
      return;
    }
    this.clearValidation();
    this.onSearch(cityName);
  }

  showValidation(message: string): void {
    this.validation.textContent = message;
  }

  clearValidation(): void {
    this.validation.textContent = '';
  }

  focusInput(): void {
    this.input.focus();
  }
}
