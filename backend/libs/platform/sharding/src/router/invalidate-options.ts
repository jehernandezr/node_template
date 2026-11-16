/** Opciones de `ShardRouter.invalidate`. */
export interface InvalidateOptions {
  /**
   * Versión del placement recién confirmada en el directorio. Con ella la
   * lápida rechaza toda versión anterior y aún deja cachear esta. Sin ella la
   * lápida se pone por encima de la versión más alta que este router ve, o
   * rechaza toda escritura hasta expirar cuando no conoce ninguna.
   */
  readonly version?: number;
}
