/** Ids of the active OpenTelemetry span. */
export interface ActiveSpanIds {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
}
