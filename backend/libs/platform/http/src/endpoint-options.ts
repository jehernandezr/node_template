import type { AuthMethod } from './auth-method.enum.js';
import type { RateLimitTier } from './rate-limit-tier.enum.js';
import type { SessionCookieMode } from './session-cookie-mode.enum.js';

/** Options of `@Endpoint`. Everything else (method, path, schemas, access) comes from the contract. */
export interface EndpointOptions {
  /**
   * How the route is authenticated. Defaults to `[AuthMethod.Jwt]` if the contract route is
   * authenticated. Declaring it on a public route is a startup error.
   */
  readonly auth?: readonly AuthMethod[];
  /** Defaults to `RateLimitTier.Auth` on public routes and `RateLimitTier.Standard` on the others. */
  readonly rateLimit?: RateLimitTier;
  /** Maximum handler time. Without a value there is no route-specific cap. */
  readonly timeoutMs?: number;
  /** Defaults to `SessionCookieMode.None`. */
  readonly sessionCookie?: SessionCookieMode;
  /** API versions the route accepts. Without a value, all supported ones. */
  readonly versions?: readonly string[];
}

/** Options of `@Resource`. */
export interface ResourceOptions {
  /** Requires the actor to have an active tenant on all the controller's routes. */
  readonly tenantScoped?: boolean;
}
