/** Data `EnvelopeFactory` builds an envelope from. */
export interface CreateEnvelopeInput<T> {
  readonly type: string;
  readonly source: string;
  readonly data: T;
  readonly subject?: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
}
