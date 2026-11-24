/** Un lote de filas leído del origen: cada fila como JSON y el cursor para pedir el siguiente. */
export interface RowPage {
  readonly rows: readonly string[];
  /** Valores de la llave de la última fila, como texto. */
  readonly lastKey: readonly string[];
  /** `updated_at` de la última fila, como texto, en las lecturas por cambio. */
  readonly lastUpdatedAt?: string;
}
