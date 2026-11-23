import {
  ConfigSection,
  envDuration,
  envList,
  envNumber,
} from '@platform/config';
import { z } from 'zod';
import { RealtimeAuthKind } from './realtime-auth-kind.enum.js';
import { RealtimeTransportKind } from './realtime-transport-kind.enum.js';

const SECOND_MS = 1000;
const HOUR_MS = 3600 * SECOND_MS;

export const realtimeConfigSchema = z.object({
  REALTIME_TRANSPORTS: envList()
    .pipe(z.array(z.enum(RealtimeTransportKind)).min(1))
    .default([RealtimeTransportKind.Sse, RealtimeTransportKind.SocketIo]),
  REALTIME_AUTH: z.enum(RealtimeAuthKind).default(RealtimeAuthKind.Bearer),
  /** Cookie con el access token cuando `REALTIME_AUTH=cookie`. */
  REALTIME_AUTH_COOKIE: z.string().trim().min(1).default('rt_access'),
  /** Latido de cada conexión: por debajo del tiempo ocioso del balanceador (60 s en el ALB). */
  REALTIME_HEARTBEAT: envDuration().default(15 * SECOND_MS),
  /** Tramas que retiene el stream de cada usuario para reanudar. */
  REALTIME_STREAM_RETAINED: envNumber({ min: 10 }).default(1000),
  /** Vida del stream de un usuario sin tramas nuevas: cubre una reconexión tras horas sin red. */
  REALTIME_STREAM_TTL: envDuration().default(24 * HOUR_MS),
});

export type RealtimeSettings = z.output<typeof realtimeConfigSchema>;

export const RealtimeConfig = new ConfigSection<RealtimeSettings>(
  'realtime',
  realtimeConfigSchema,
);
