/** Fixed values of the `AuthModule` wiring. */
export class AuthModuleRules {
  /** Valid revoked sessions the local Bloom filter is sized for. */
  static readonly REVOKED_SESSIONS_EXPECTED_ITEMS = 100_000;

  /** In-memory lifetime of epochs, permission versions and grants. */
  static readonly DEFAULT_CACHE_TTL_MS = 5_000;

  /** Maximum entries of each local cache. */
  static readonly DEFAULT_CACHE_MAX_ENTRIES = 10_000;
}
