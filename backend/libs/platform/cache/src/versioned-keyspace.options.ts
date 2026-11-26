import type { IdGenerator } from '@platform/kernel';

/** Options of `VersionedKeyspace`. */
export interface VersionedKeyspaceOptions {
  /** First segment of each key. Defaults to `cache`. Cannot contain ':'. */
  readonly prefix?: string;
  /** Maximum length of an accepted key. Defaults to `VersionedKeyspace.DEFAULT_MAX_KEY_LENGTH`. */
  readonly maxKeyLength?: number;
  /** Generates the version tokens. */
  readonly ids: IdGenerator;
}
