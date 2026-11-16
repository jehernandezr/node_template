/** Límites y valores fijos de la entrada HTTP. */
export class HttpLimits {
  /** Cuerpo JSON máximo: 256 KiB. */
  static readonly MAX_BODY_BYTES = 256 * 1024;
  /** Largo máximo del `User-Agent` que se guarda en `ClientInfo`. */
  static readonly MAX_USER_AGENT_LENGTH = 512;
  /** Nombre de la cookie de sesión; el prefijo `__Host-` exige `Secure`, `Path=/` y ningún `Domain`. */
  static readonly SESSION_COOKIE_NAME = '__Host-session';
  /** Prefijo del session token opaco: con él un `Bearer` se reconoce como canal nativo y no como access token. */
  static readonly SESSION_TOKEN_PREFIX = 'st1_';
  /** Prefijo de una API key: con él un `Bearer` se autentica como API key. */
  static readonly API_KEY_PREFIX = 'sk_';
  /** Valor del header `X-Session-Transport` con el que la app nativa declara su canal. */
  static readonly SESSION_TRANSPORT_BEARER = 'bearer';
  /** Versión de la API vigente. */
  static readonly CURRENT_API_VERSION = '2026-11-01';
  /** Ruta que lleva la cabecera `Cache-Control: no-store`. */
  static readonly NO_STORE_PATH_PREFIX = '/v1/auth';
}
