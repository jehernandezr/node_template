/** Lo que el traductor de errores necesita saber de la llamada que falló. */
export interface CallErrorContext {
  /** Si algún intento llegó a enviarse. */
  readonly started: boolean;
  /** Señal de cancelación de quien llama. */
  readonly signal?: AbortSignal;
}
