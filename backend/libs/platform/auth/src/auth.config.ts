import { ConfigSection } from '@platform/config';
import { z } from 'zod';

/**
 * Variables de la verificación de tokens. `AUTH_JWKS_URL` solo hace falta en los
 * servicios que descargan las claves de identity; identity y las pruebas pasan su
 * propia `JwksKeySource` al módulo.
 */
export const authConfigSchema = z.object({
  /** Emisor que debe nombrar el claim `iss` (el `IDENTITY_ISSUER` de la región). */
  AUTH_ISSUER: z.string().trim().min(1),
  /** URL del JWKS público de identity. */
  AUTH_JWKS_URL: z.url().optional(),
});

/** Configuración validada de `@platform/auth`. */
export type AuthSettings = z.infer<typeof authConfigSchema>;

/** Sección de configuración que `AuthModule` valida al arrancar. */
export const AuthConfig = new ConfigSection<AuthSettings>(
  'auth',
  authConfigSchema,
);
