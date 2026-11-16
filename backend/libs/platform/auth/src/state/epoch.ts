/**
 * Estado de revocación masiva de un usuario o de un tenant. `revokedBefore` es
 * epoch en segundos: todo token con `iat` anterior queda revocado.
 */
export interface Epoch {
  readonly revokedBefore: number;
  readonly suspended: boolean;
}
