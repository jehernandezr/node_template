/** CloudEvents 1.0 envelope that wraps a typed payload. Allows extension attributes. */
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
