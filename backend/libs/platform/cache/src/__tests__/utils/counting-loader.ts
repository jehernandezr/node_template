/** Carga de prueba que cuenta sus llamadas en `calls` y puede fallar o quedarse esperando. */
export class CountingLoader<T> {
  calls = 0;
  private error: Error | undefined;
  private gate: Promise<void> | undefined;

  constructor(private readonly value: T) {}

  /** Función de carga. Es una propiedad flecha para pasarla como `load` sin perder `this`. */
  load = async (): Promise<T> => {
    this.calls += 1;
    if (this.gate !== undefined) {
      await this.gate;
    }
    if (this.error !== undefined) {
      throw this.error;
    }
    return this.value;
  };

  /** Hace que cada carga posterior rechace con `error`. */
  failWith(error: Error): void {
    this.error = error;
  }

  /** Deja la siguiente carga pendiente hasta que se llame a la función devuelta. */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.gate = new Promise<void>((resolve) => {
      release = (): void => resolve();
    });
    return () => release();
  }
}
