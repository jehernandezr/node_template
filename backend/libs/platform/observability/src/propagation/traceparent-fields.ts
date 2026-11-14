export interface TraceparentFields {
  readonly traceId: string;
  readonly spanId: string;
  readonly sampled: boolean;
}
