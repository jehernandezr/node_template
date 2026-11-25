/**
 * Identity that a token authenticates. It comes from the Valkey configuration
 * (`VALKEY_USER`, `VALKEY_CACHE_NAME`, `VALKEY_AUTH`), so the token
 * provider does not repeat those variables.
 */
export interface ValkeyAuthRequest {
  /** ACL user; with IAM its id and its name match. */
  readonly userId: string;
  /** Cache name (not its endpoint): the host that signs the token. */
  readonly cacheName: string;
  /** Whether the cache is serverless (`VALKEY_AUTH=iam-serverless`). */
  readonly serverless: boolean;
}
