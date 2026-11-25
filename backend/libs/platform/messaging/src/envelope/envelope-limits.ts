import { TenantId } from '@platform/kernel';

/** Size limits of the envelope and of each of its attributes. */
export class EnvelopeLimits {
  /** Maximum size of the serialized envelope (256 KB), `data` included. */
  static readonly MAX_BYTES = 256 * 1024;
  static readonly MAX_ID_LENGTH = 128;
  static readonly MAX_TYPE_LENGTH = 256;
  /** `source` is a URI reference. */
  static readonly MAX_SOURCE_LENGTH = 1024;
  static readonly MAX_SUBJECT_LENGTH = 1024;
  /** A single tenant maximum for the whole platform. */
  static readonly MAX_TENANT_ID_LENGTH = TenantId.MAX_LENGTH;
  static readonly MAX_ACTOR_ID_LENGTH = 128;
  /** Length of a W3C version 00 `traceparent`. */
  static readonly MAX_TRACEPARENT_LENGTH = 55;
  static readonly MAX_TIME_LENGTH = 64;
}
