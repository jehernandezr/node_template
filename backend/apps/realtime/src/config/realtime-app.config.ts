import { z } from 'zod';
import { envNumber, serviceConfigSchema } from '@platform/config';

/**
 * Configuration of `apps/realtime`. It reads the notifications real-time stream, so its Valkey prefix
 * (`VALKEY_KEY_PREFIX`) is the notifications one and its routes are the ones notifications publishes.
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
