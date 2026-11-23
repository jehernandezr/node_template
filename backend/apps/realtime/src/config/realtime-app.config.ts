import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';

/**
 * Configuración de `apps/realtime`. Lee el stream de tiempo real de notifications, así que su prefijo de
 * Valkey (`VALKEY_KEY_PREFIX`) es el de notifications y sus rutas son las que notifications publica.
 */
export const realtimeAppConfigSchema = serviceConfigSchema.extend({
  PORT: envNumber({ min: 0, max: 65_535 }).default(3000),
  REALTIME_SSE_PATH: z
    .string()
    .startsWith('/')
    .default('/v1/notifications/stream'),
  REALTIME_SOCKET_NAMESPACE: z
    .string()
    .startsWith('/')
    .default('/notifications'),
});

export type RealtimeAppConfig = z.output<typeof realtimeAppConfigSchema>;
