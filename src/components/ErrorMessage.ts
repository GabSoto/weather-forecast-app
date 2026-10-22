/** Zona de errores de la UI. Renderiza el texto recibido (obtenido de errorMessages.ts). */
export class ErrorMessage {
  private readonly element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = container.ownerDocument.createElement('p');
    this.element.className = 'error-message';
    container.replaceChildren(this.element);
  }

  show(message: string): void {
    this.element.textContent = message;
  }

  clear(): void {
    this.element.textContent = '';
  }
}
