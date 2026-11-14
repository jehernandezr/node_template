import type { IdGenerator } from '@platform/kernel';

/** Opciones de `VersionedKeyspace`. */
export interface VersionedKeyspaceOptions {
  /** Primer segmento de cada llave. Por defecto `cache`. No puede contener ':'. */
  readonly prefix?: string;
  /** Largo máximo de una llave aceptada. Por defecto `VersionedKeyspace.DEFAULT_MAX_KEY_LENGTH`. */
  readonly maxKeyLength?: number;
  /** Genera los tokens de versión. Por defecto UUIDv7 con el reloj del sistema. */
  readonly ids?: IdGenerator;
}
