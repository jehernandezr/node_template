/** Valores fijos del cableado de `AuthModule`. */
export class AuthModuleRules {
  /** Sesiones revocadas vigentes para las que se dimensiona el Bloom local. */
  static readonly REVOKED_SESSIONS_EXPECTED_ITEMS = 100_000;

  /** Vida en memoria de épocas, versiones de permisos y grants. */
  static readonly DEFAULT_CACHE_TTL_MS = 5_000;

  /** Entradas máximas de cada caché local. */
  static readonly DEFAULT_CACHE_MAX_ENTRIES = 10_000;
}
