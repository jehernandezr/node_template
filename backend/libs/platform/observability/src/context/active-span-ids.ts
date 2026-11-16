/** Ids del span activo de OpenTelemetry. */
export interface ActiveSpanIds {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
}
