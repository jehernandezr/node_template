/** Cómo se autentica una petición a una ruta. */
export enum AuthMethod {
  /** Access token JWT en `Authorization: Bearer`. */
  Jwt = 'jwt',
  /** API key (`sk_live_...` o `sk_test_...`) en `Authorization: Bearer`. */
  ApiKey = 'api-key',
}
