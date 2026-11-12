import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';

/** Maximum serialized size of one envelope (256 KB). */
export const MAX_ENVELOPE_BYTES = 256 * 1024;

/** Maximum length of an envelope id. */
export const MAX_ENVELOPE_ID_LENGTH = 128;

const TRACEPARENT_PATTERN =
  /^[0-9a-f]{2}-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/;

/** CloudEvents 1.0 envelope wrapping a typed payload. Extension attributes are allowed. */
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

/**
 * Zod schema for the CloudEvents envelope. Unknown (extension) attributes pass through.
 * The `data` payload is not inspected here; each contract validates it with its own schema.
 */
export const messageEnvelopeSchema = z.looseObject({
  specversion: z.literal('1.0'),
  id: z.string().min(1).max(MAX_ENVELOPE_ID_LENGTH),
  type: z.string().min(1),
  source: z.string().min(1),
  subject: z.string().optional(),
  time: z.iso.datetime({ offset: true }),
  datacontenttype: z.literal('application/json'),
  traceparent: z
    .string()
    .regex(TRACEPARENT_PATTERN, 'traceparent must be a W3C trace context')
    .optional(),
  tenantid: z.string().optional(),
  actorid: z.string().optional(),
  data: z.unknown(),
});

/** Input accepted by {@link createEnvelope}. */
export interface CreateEnvelopeInput<T> {
  readonly type: string;
  readonly source: string;
  readonly data: T;
  readonly subject?: string;
  readonly traceparent?: string;
  readonly tenantId?: string;
  readonly actorId?: string;
}

/** Injectable sources of id and time, so tests can be deterministic. */
export interface EnvelopeFactoryOptions {
  /** Defaults to a UUID v7. */
  readonly newId?: () => string;
  /** Defaults to the current date. */
  readonly now?: () => Date;
}

/** Builds a CloudEvents 1.0 envelope. Optional attributes are omitted when not provided. */
export function createEnvelope<T>(
  input: CreateEnvelopeInput<T>,
  options: EnvelopeFactoryOptions = {},
): MessageEnvelope<T> {
  const newId = options.newId ?? (() => uuidv7());
  const now = options.now ?? (() => new Date());

  return {
    specversion: '1.0',
    id: newId(),
    type: input.type,
    source: input.source,
    time: now().toISOString(),
    datacontenttype: 'application/json',
    data: input.data,
    ...(input.subject !== undefined ? { subject: input.subject } : {}),
    ...(input.traceparent !== undefined
      ? { traceparent: input.traceparent }
      : {}),
    ...(input.tenantId !== undefined ? { tenantid: input.tenantId } : {}),
    ...(input.actorId !== undefined ? { actorid: input.actorId } : {}),
  };
}

/** Serialized size of a value as JSON, in bytes. */
export function envelopeSizeBytes(envelope: unknown): number {
  return new TextEncoder().encode(JSON.stringify(envelope)).byteLength;
}

/**
 * Validates an envelope, round-trips it through JSON (so the returned value is exactly
 * what a transport would carry) and enforces the size limit.
 */
export function toWireEnvelope<T>(
  envelope: MessageEnvelope<T>,
): MessageEnvelope<T> {
  const wire: unknown = JSON.parse(JSON.stringify(envelope));
  const parsed = messageEnvelopeSchema.safeParse(wire);
  if (!parsed.success) {
    throw new MessagingError(
      MessagingErrorCode.InvalidEnvelope,
      `invalid envelope: ${parsed.error.message}`,
    );
  }
  const size = envelopeSizeBytes(wire);
  if (size > MAX_ENVELOPE_BYTES) {
    throw new MessagingError(
      MessagingErrorCode.PayloadTooLarge,
      `envelope is ${size} bytes, limit is ${MAX_ENVELOPE_BYTES}`,
    );
  }
  return wire as MessageEnvelope<T>;
}
