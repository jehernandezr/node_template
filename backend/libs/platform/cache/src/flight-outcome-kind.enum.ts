/** Qué entrega el líder de una carga compartida de `CacheAside`. */
export enum FlightOutcomeKind {
  /** El texto serializado, leído del caché o recién cargado. */
  Raw = 'raw',
  /** El valor cargado, cuando no se pudo serializar. */
  Value = 'value',
}
