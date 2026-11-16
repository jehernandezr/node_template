/** Escalón de límite de tasa de una ruta. `RateLimitTierRules` traduce cada uno a una regla. */
export enum RateLimitTier {
  /** Rutas de credenciales y de recuperación, contadas por IP. */
  Auth = 'auth',
  /** Operaciones sensibles de un usuario autenticado. */
  Sensitive = 'sensitive',
  /** Tráfico normal de la API. */
  Standard = 'standard',
  /** Tráfico entre servicios. */
  Internal = 'internal',
}
