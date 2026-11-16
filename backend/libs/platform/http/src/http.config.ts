import {
  ConfigSection,
  envDuration,
  envList,
  envNumber,
} from '@platform/config';
import { z } from 'zod';

/**
 * Variables de la entrada HTTP. `SESSION_IDLE_TTL` es la misma variable que lee el servicio que
 * emite las sesiones: la cookie dura lo que la ventana de inactividad.
 */
export const httpConfigSchema = z.object({
  /** Orígenes permitidos para CORS y para la política de `Origin`, separados por coma. */
  WEB_ORIGINS: envList().default([]),
  /** Saltos de proxy de confianza para calcular la IP del cliente. */
  TRUST_PROXY_HOPS: envNumber({ min: 0, max: 10 }).default(0),
  /** Vida de la cookie de sesión. */
  SESSION_IDLE_TTL: envDuration().default(86_400_000),
  /** Base de la URL `type` de los Problem Details. */
  PROBLEM_TYPE_BASE_URL: z.url().default('https://docs.node-template.dev'),
});

export type HttpSettings = z.infer<typeof httpConfigSchema>;

/** Sección de configuración que `HttpModule` valida al arrancar. */
export const HttpConfig = new ConfigSection<HttpSettings>(
  'http',
  httpConfigSchema,
);
