import type { Type } from '@nestjs/common';
import type { AppConfig } from '@platform/config';
import type { PresenceTracker } from '../presence/presence-tracker.js';
import type { RealtimeStream } from '../stream/realtime-stream.js';

export interface RealtimeModuleOptions {
  /** Ruta `GET` de la transmisión SSE, por ejemplo `/v1/notifications/stream`. */
  readonly ssePath: string;
  /** Namespace de Socket.IO, por ejemplo `/notifications`. */
  readonly socketNamespace: string;
  /** Lo provee otro módulo global, como `ValkeyRealtimeStream`. Por defecto `InMemoryRealtimeStream`, válido solo con una instancia. */
  readonly stream?: Type<RealtimeStream>;
  /** Por defecto `InMemoryPresenceTracker`, válido solo con una instancia. */
  readonly presence?: Type<PresenceTracker>;
  /**
   * Si este proceso atiende conexiones. Sin transportes el módulo solo publica: así lo monta el servicio que
   * decide qué enviar cuando otro proceso (`apps/realtime`) atiende las conexiones.
   */
  readonly serveConnections: (config: AppConfig) => boolean;
}
