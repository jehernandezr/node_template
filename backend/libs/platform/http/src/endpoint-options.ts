import type { AuthMethod } from './auth-method.enum.js';
import type { RateLimitTier } from './rate-limit-tier.enum.js';
import type { SessionCookieMode } from './session-cookie-mode.enum.js';

/** Opciones de `@Endpoint`. Todo lo demás (método, path, esquemas, acceso) sale del contrato. */
export interface EndpointOptions {
  /**
   * Cómo se autentica la ruta. Por defecto `[AuthMethod.Jwt]` si la ruta del contrato es
   * autenticada. Declararlo en una ruta pública es un error al arrancar.
   */
  readonly auth?: readonly AuthMethod[];
  /** Por defecto `RateLimitTier.Auth` en rutas públicas y `RateLimitTier.Standard` en las demás. */
  readonly rateLimit?: RateLimitTier;
  /** Tiempo máximo del handler. Sin valor no hay tope propio. */
  readonly timeoutMs?: number;
  /** Por defecto `SessionCookieMode.None`. */
  readonly sessionCookie?: SessionCookieMode;
  /** Versiones de la API que acepta la ruta. Sin valor, todas las soportadas. */
  readonly versions?: readonly string[];
}

/** Opciones de `@Resource`. */
export interface ResourceOptions {
  /** Exige que el actor traiga tenant activo en todas las rutas del controller. */
  readonly tenantScoped?: boolean;
}
