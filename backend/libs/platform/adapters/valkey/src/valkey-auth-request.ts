/**
 * Identidad que un token autentica. Sale de la configuración de Valkey
 * (`VALKEY_USER`, `VALKEY_CACHE_NAME`, `VALKEY_AUTH`), así el proveedor del
 * token no repite esas variables.
 */
export interface ValkeyAuthRequest {
  /** Usuario de la ACL; con IAM su id y su nombre coinciden. */
  readonly userId: string;
  /** Nombre de la caché (no su endpoint): el host que firma el token. */
  readonly cacheName: string;
  /** La caché es serverless (`VALKEY_AUTH=iam-serverless`). */
  readonly serverless: boolean;
}
