import {
  type Clock,
  err,
  type IdGenerator,
  ok,
  type Result,
  SystemClock,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { z } from 'zod';
import {
  MessagingError,
  MessagingErrorCode,
} from '../errors/messaging-error.js';

/** Maximum serialized size of one envelope (256 KB), `data` included. */
export const MAX_ENVELOPE_BYTES = 256 * 1024;

/** Maximum length of an envelope id. */
export const MAX_ENVELOPE_ID_LENGTH = 128;

/** Maximum length of the `type` attribute. */
export const MAX_ENVELOPE_TYPE_LENGTH = 256;

/** Maximum length of the `source` attribute (a URI reference). */
export const MAX_ENVELOPE_SOURCE_LENGTH = 1024;

/** Maximum length of the `subject` attribute. */
export const MAX_ENVELOPE_SUBJECT_LENGTH = 1024;

/** Maximum length of the `tenantid` and `actorid` attributes. */
export const MAX_ENVELOPE_TENANT_ID_LENGTH = 128;
export const MAX_ENVELOPE_ACTOR_ID_LENGTH = 128;

/** Length of a W3C `traceparent` (version 00). */
export const MAX_TRACEPARENT_LENGTH = 55;

/** Maximum length of the `time` attribute. */
export const MAX_ENVELOPE_TIME_LENGTH = 64;

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
 * Zod schema for the CloudEvents envelope. Every string attribute has a length
 * limit. Unknown (extension) attributes pass through; the whole envelope is
 * bounded by {@link MAX_ENVELOPE_BYTES}, checked by {@link parseEnvelope} before
 * this schema runs. The `data` payload is not inspected here; each contract
 * validates it with its own schema.
 */
export const messageEnvelopeSchema = z.looseObject({
  specversion: z.literal('1.0'),
  id: z.string().min(1).max(MAX_ENVELOPE_ID_LENGTH),
  type: z.string().min(1).max(MAX_ENVELOPE_TYPE_LENGTH),
  source: z.string().min(1).max(MAX_ENVELOPE_SOURCE_LENGTH),
  subject: z.string().max(MAX_ENVELOPE_SUBJECT_LENGTH).optional(),
  time: z.iso.datetime({ offset: true }).max(MAX_ENVELOPE_TIME_LENGTH),
  datacontenttype: z.literal('application/json'),
  traceparent: z
    .string()
    .max(MAX_TRACEPARENT_LENGTH)
    .regex(TRACEPARENT_PATTERN, 'traceparent must be a W3C trace context')
    .optional(),
  tenantid: z.string().min(1).max(MAX_ENVELOPE_TENANT_ID_LENGTH).optional(),
  actorid: z.string().min(1).max(MAX_ENVELOPE_ACTOR_ID_LENGTH).optional(),
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
  /** Source of envelope ids. Defaults to UUIDv7 from `@platform/kernel`. */
  readonly ids?: IdGenerator;
  /** Source of the envelope time. Defaults to the system clock. */
  readonly clock?: Clock;
  /** @deprecated Use `ids`. Takes precedence over `ids` when given. */
  readonly newId?: () => string;
  /** @deprecated Use `clock`. Takes precedence over `clock` when given. */
  readonly now?: () => Date;
}

const defaultIds: IdGenerator = new UuidV7IdGenerator();
const defaultClock: Clock = new SystemClock();

/** Builds a CloudEvents 1.0 envelope. Optional attributes are omitted when not provided. */
export function createEnvelope<T>(
  input: CreateEnvelopeInput<T>,
  options: EnvelopeFactoryOptions = {},
): MessageEnvelope<T> {
  const ids = options.ids ?? defaultIds;
  const clock = options.clock ?? defaultClock;
  const id = options.newId ? options.newId() : ids.next().toString();
  const time = options.now ? options.now() : clock.now();

  return {
    specversion: '1.0',
    id,
    type: input.type,
    source: input.source,
    time: time.toISOString(),
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

const encoder = new TextEncoder();

/** Serialized size of a value as JSON, in bytes. */
export function envelopeSizeBytes(envelope: unknown): number {
  return encoder.encode(JSON.stringify(envelope)).byteLength;
}

function tooLarge(size: number | undefined): MessagingError {
  return new MessagingError(
    MessagingErrorCode.PayloadTooLarge,
    size === undefined
      ? `envelope exceeds the limit of ${MAX_ENVELOPE_BYTES} bytes`
      : `envelope is ${size} bytes, limit is ${MAX_ENVELOPE_BYTES}`,
  );
}

function invalid(reason: string): MessagingError {
  return new MessagingError(
    MessagingErrorCode.InvalidEnvelope,
    `invalid envelope: ${reason}`,
  );
}

/**
 * Parses one raw delivery: a JSON string (as a transport receives it) or an
 * already decoded value. The size limit is enforced first, before `JSON.parse`
 * and before any schema runs, so oversized input never reaches the parsers.
 * Then the envelope attributes are validated with their length limits. The
 * `data` payload is left to the contract schema.
 */
export function parseEnvelope(
  raw: unknown,
): Result<MessageEnvelope, MessagingError> {
  let candidate: unknown = raw;
  if (typeof raw === 'string') {
    // A UTF-16 length above the limit already means more bytes than the limit.
    if (raw.length > MAX_ENVELOPE_BYTES) return err(tooLarge(undefined));
    const size = encoder.encode(raw).byteLength;
    if (size > MAX_ENVELOPE_BYTES) return err(tooLarge(size));
    try {
      candidate = JSON.parse(raw);
    } catch {
      return err(invalid('body is not valid JSON'));
    }
  } else {
    let size: number;
    try {
      size = envelopeSizeBytes(raw);
    } catch {
      return err(invalid('envelope is not serializable as JSON'));
    }
    if (size > MAX_ENVELOPE_BYTES) return err(tooLarge(size));
  }

  const parsed = messageEnvelopeSchema.safeParse(candidate);
  if (!parsed.success) return err(invalid(parsed.error.message));
  // Zod marks `data` optional in the inferred type; contracts validate it later.
  return ok(parsed.data as MessageEnvelope);
}

/**
 * Validates an envelope, round-trips it through JSON (so the returned value is exactly
 * what a transport would carry) and enforces the size and attribute limits.
 */
export function toWireEnvelope<T>(
  envelope: MessageEnvelope<T>,
): MessageEnvelope<T> {
  const wire: unknown = JSON.parse(JSON.stringify(envelope));
  const parsed = messageEnvelopeSchema.safeParse(wire);
  if (!parsed.success) throw invalid(parsed.error.message);
  const size = envelopeSizeBytes(wire);
  if (size > MAX_ENVELOPE_BYTES) throw tooLarge(size);
  return wire as MessageEnvelope<T>;
}
