import { TenantId } from '@platform/kernel';

/** Límites de tamaño del sobre y de cada uno de sus atributos. */
export class EnvelopeLimits {
  /** Tamaño máximo del sobre serializado (256 KB), `data` incluido. */
  static readonly MAX_BYTES = 256 * 1024;
  static readonly MAX_ID_LENGTH = 128;
  static readonly MAX_TYPE_LENGTH = 256;
  /** `source` es una referencia URI. */
  static readonly MAX_SOURCE_LENGTH = 1024;
  static readonly MAX_SUBJECT_LENGTH = 1024;
  /** Un solo máximo de tenant para toda la plataforma. */
  static readonly MAX_TENANT_ID_LENGTH = TenantId.MAX_LENGTH;
  static readonly MAX_ACTOR_ID_LENGTH = 128;
  /** Longitud de un `traceparent` W3C versión 00. */
  static readonly MAX_TRACEPARENT_LENGTH = 55;
  static readonly MAX_TIME_LENGTH = 64;
}
