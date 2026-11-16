/** Una página de resultados. `nextCursor` es `null` en la última página. */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
