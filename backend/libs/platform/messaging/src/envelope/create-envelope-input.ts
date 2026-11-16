/** Datos con los que `EnvelopeFactory` arma un sobre. */
export interface CreateEnvelopeInput<T> {
  readonly type: string;
  readonly source: string;
  readonly data: T;
  readonly subject?: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
}
