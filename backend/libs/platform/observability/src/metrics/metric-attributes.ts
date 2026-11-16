/** Atributos de una medición. Deben tener cardinalidad baja: nunca ids de usuario ni de tenant. */
export type MetricAttributes = Readonly<
  Record<string, string | number | boolean>
>;
