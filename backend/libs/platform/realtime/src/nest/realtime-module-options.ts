import type { Type } from '@nestjs/common';
import type { AppConfig } from '@platform/config';
import type { PresenceTracker } from '../presence/presence-tracker.js';
import type { RealtimeStream } from '../stream/realtime-stream.js';

export interface RealtimeModuleOptions {
  /** `GET` route of the SSE stream, for example `/v1/notifications/stream`. */
  readonly ssePath: string;
  /** Socket.IO namespace, for example `/notifications`. */
  readonly socketNamespace: string;
  /** Provided by another global module, such as `ValkeyRealtimeStream`. Defaults to `InMemoryRealtimeStream`, valid only with a single instance. */
  readonly stream?: Type<RealtimeStream>;
  /** Defaults to `InMemoryPresenceTracker`, valid only with a single instance. */
  readonly presence?: Type<PresenceTracker>;
  /**
   * Whether this process serves connections. Without transports the module only publishes: that is how the service that
   * decides what to send mounts it when another process (`apps/realtime`) serves the connections.
   */
  readonly serveConnections: (config: AppConfig) => boolean;
}
