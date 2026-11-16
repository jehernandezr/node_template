export interface ConfigIssue {
  /** Ruta con puntos a la llave inválida, por ejemplo `LOG_SAMPLE_RATE`. `(root)` si se rechaza todo el valor. */
  readonly path: string;
  readonly code: string;
  /** Mensaje del validador. Nunca incluye el valor recibido. */
  readonly message: string;
}
