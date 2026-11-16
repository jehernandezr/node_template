/** Ventana fija en la que cae un instante. */
export interface WindowPosition {
  /** Número de la ventana fija: `floor(ahora / W)`. */
  readonly index: number;
  /** Milisegundos transcurridos desde el inicio de la ventana, en `[0, W)`. */
  readonly elapsedMs: number;
}
