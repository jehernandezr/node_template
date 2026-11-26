/** Limits and fixed values of the HTTP entry. */
export class HttpLimits {
  /** Maximum JSON body: 256 KiB. */
  static readonly MAX_BODY_BYTES = 256 * 1024;
  /** Maximum length of the `User-Agent` stored in `ClientInfo`. */
  static readonly MAX_USER_AGENT_LENGTH = 512;
  /** Session cookie name; the `__Host-` prefix requires `Secure`, `Path=/` and no `Domain`. */
  static readonly SESSION_COOKIE_NAME = '__Host-session';
  /** Prefix of the opaque session token: with it a `Bearer` is recognized as the native channel and not as an access token. */
  static readonly SESSION_TOKEN_PREFIX = 'st1_';
  /** Prefix of an API key: with it a `Bearer` is authenticated as an API key. */
  static readonly API_KEY_PREFIX = 'sk_';
  /** Value of the `X-Session-Transport` header with which the native app declares its channel. */
  static readonly SESSION_TRANSPORT_BEARER = 'bearer';
  /** Version a request gets when it sends no `Api-Version` header and its route pins none. */
  static readonly CURRENT_API_VERSION = '2026-11-01';
  /** Route that carries the `Cache-Control: no-store` header. */
  static readonly NO_STORE_PATH_PREFIX = '/v1/auth';
}
