/** Sobre CloudEvents 1.0 que envuelve un payload tipado. Admite atributos de extensión. */
export interface MessageEnvelope<T = unknown> {
  readonly specversion: '1.0';
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly subject?: string;
  readonly time: string;
  readonly datacontenttype: 'application/json';
  readonly traceparent?: string;
  readonly tenantid?: string;
  readonly actorid?: string;
  readonly data: T;
  readonly [extension: string]: unknown;
}
