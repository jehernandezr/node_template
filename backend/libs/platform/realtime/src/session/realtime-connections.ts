import type { Clock, IdGenerator } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import type { StreamPrincipal } from '../auth/stream-principal.js';
import type { StreamRevocations } from '../auth/stream-revocations.js';
import type { PresenceTracker } from '../presence/presence-tracker.js';
import type { RealtimeStream } from '../stream/realtime-stream.js';
import type { FrameSink } from './frame-sink.js';
import { RealtimeConnection } from './realtime-connection.js';
import { RealtimeSession } from './realtime-session.js';

/** Abre las conexiones de los transportes y las cierra todas al apagar. */
export class RealtimeConnections {
  private readonly open = new Map<string, RealtimeConnection>();

  constructor(
    private readonly stream: RealtimeStream,
    private readonly presence: PresenceTracker,
    private readonly revocations: StreamRevocations,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly logger: LoggerPort,
    private readonly heartbeatMs: number,
  ) {}

  /** Entrega lo pendiente desde `lastEventId` y deja la conexión escuchando hasta que venza la sesión. */
  async connect(
    principal: StreamPrincipal,
    sink: FrameSink,
    lastEventId: string | undefined,
  ): Promise<RealtimeConnection> {
    const openedAt = this.clock.now();
    const connection = new RealtimeConnection(
      this.ids.next().toString(),
      new RealtimeSession(
        this.stream,
        principal,
        sink,
        lastEventId,
        this.logger,
      ),
      sink,
      this.presence,
      this.revocations,
      openedAt,
      this.logger,
    );
    this.open.set(connection.id, connection);
    connection.whenClosed(() => this.open.delete(connection.id));
    const closeInMs = principal.sessionExpiresAt * 1000 - openedAt.getTime();
    await connection.start(this.heartbeatMs, closeInMs);
    return connection;
  }

  get size(): number {
    return this.open.size;
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.open.values()].map((c) => c.close()));
  }
}
