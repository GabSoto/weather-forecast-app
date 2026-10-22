/** Indicador de carga simple: se muestra u oculta según el estado de la solicitud. */
export class LoadingIndicator {
  private readonly element: HTMLElement;

  constructor(container: HTMLElement) {
    this.element = container.ownerDocument.createElement('p');
    this.element.className = 'loading';
    this.element.textContent = 'Buscando el pronóstico...';
    this.element.hidden = true;
    container.replaceChildren(this.element);
  }

  show(): void {
    this.element.hidden = false;
  }

  hide(): void {
    this.element.hidden = true;
  }

  isVisible(): boolean {
    return !this.element.hidden;
  }
}
