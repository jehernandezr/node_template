/** How a request to a route is authenticated. */
export enum AuthMethod {
  /** JWT access token in `Authorization: Bearer`. */
  Jwt = 'jwt',
  /** API key (`sk_live_...` or `sk_test_...`) in `Authorization: Bearer`. */
  ApiKey = 'api-key',
}
