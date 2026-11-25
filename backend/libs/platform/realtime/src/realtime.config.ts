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
  /** Cookie with the access token when `REALTIME_AUTH=cookie`. */
  REALTIME_AUTH_COOKIE: z.string().trim().min(1).default('rt_access'),
  /** Heartbeat of each connection: below the load balancer's idle timeout (60 s on the ALB). */
  REALTIME_HEARTBEAT: envDuration().default(15 * SECOND_MS),
  /** Frames that each user's stream retains for resuming. */
  REALTIME_STREAM_RETAINED: envNumber({ min: 10 }).default(1000),
  /** Lifetime of a user's stream without new frames: covers a reconnection after hours without network. */
  REALTIME_STREAM_TTL: envDuration().default(24 * HOUR_MS),
});

export type RealtimeSettings = z.output<typeof realtimeConfigSchema>;

export const RealtimeConfig = new ConfigSection<RealtimeSettings>(
  'realtime',
  realtimeConfigSchema,
);
