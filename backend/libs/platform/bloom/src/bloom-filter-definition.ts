/**
 * Declaración de un filtro con nombre: cuánto cabe, cuánto puede equivocarse y cuándo se reconstruye.
 * @typeParam TName enum de nombres de filtro del llamador, como cadena.
 */
export interface BloomFilterDefinition<TName extends string = string> {
  readonly name: TName;
  /** Ítems para los que se dimensiona el filtro. Más allá de ellos, la tasa de falsos positivos crece. */
  readonly expectedItems: number;
  /** Tasa de falsos positivos objetivo. Por defecto `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE` (1 %). */
  readonly falsePositiveRate?: number;
  /**
   * Expresión cron (cinco campos, o seis con segundos, en UTC) del job que reconstruye el filtro desde su
   * fuente de verdad. Un filtro no olvida ítems, así que la reconstrucción es lo que descarta los eliminados
   * y reinicia un filtro que creció más allá de `expectedItems`.
   */
  readonly rebuildCron: string;
}

/** Una definición con su valor por defecto aplicado y sus valores verificados. */
export interface ResolvedBloomFilterDefinition<
  TName extends string = string,
> extends BloomFilterDefinition<TName> {
  readonly falsePositiveRate: number;
}
