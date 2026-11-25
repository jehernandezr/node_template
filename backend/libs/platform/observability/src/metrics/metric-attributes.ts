/** Attributes of a measurement. They must have low cardinality: never user or tenant ids. */
export type MetricAttributes = Readonly<
  Record<string, string | number | boolean>
>;
