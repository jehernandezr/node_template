import type { LoggerPort } from '@platform/observability';
import type { StreamRevocations } from '../auth/stream-revocations.js';
import type { PresenceTracker } from '../presence/presence-tracker.js';
import type { RealtimeSession } from './realtime-session.js';
import type { FrameSink } from './frame-sink.js';

/**
 * Lo que dura mientras una conexión sigue abierta: la presencia del usuario, la señal de vida y el cierre al
 * vencer su sesión o al revocarse su tenant. Cada latido también relee el stream, por si se perdió un aviso
 * de trama nueva.
 */
export class RealtimeConnection {
  /** `setTimeout` dispara de inmediato con una espera mayor: una sesión de meses cerraría la conexión al abrirla. */
  private static readonly MAX_TIMER_MS = 2 ** 31 - 1;

  private heartbeat: NodeJS.Timeout | undefined;
  private expiry: NodeJS.Timeout | undefined;
  private onClosed: (() => void) | undefined;

  constructor(
    readonly id: string,
    private readonly session: RealtimeSession,
    private readonly sink: FrameSink,
    private readonly presence: PresenceTracker,
    private readonly revocations: StreamRevocations,
    private readonly openedAt: Date,
    private readonly logger: LoggerPort,
  ) {}

  /** Si la sesión no logra abrirse, la conexión se cierra y deja de anunciarse antes de propagar el error. */
  async start(heartbeatMs: number, closeInMs: number): Promise<void> {
    await this.announce(heartbeatMs);
    // Latido de una conexión viva, no un job: termina con la conexión.
    this.heartbeat = setInterval(
      () => void this.beat(heartbeatMs),
      heartbeatMs,
    );
    this.heartbeat.unref();
    this.expiry = setTimeout(
      () => void this.close(),
      Math.min(Math.max(0, closeInMs), RealtimeConnection.MAX_TIMER_MS),
    );
    this.expiry.unref();
    try {
      await this.session.open();
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  whenClosed(listener: () => void): void {
    this.onClosed = listener;
  }

  async close(): Promise<void> {
    clearInterval(this.heartbeat);
    clearTimeout(this.expiry);
    await this.session
      .close()
      .catch((error: unknown) =>
        this.report('stream unsubscribe failed', error),
      );
    await this.presence
      .disconnected(this.session.channel, this.id)
      .catch((error: unknown) => this.report('presence leave failed', error));
    this.onClosed?.();
  }

  private async beat(heartbeatMs: number): Promise<void> {
    if (await this.revoked()) {
      await this.close();
      return;
    }
    this.sink.keepAlive();
    this.session.catchUp();
    await this.announce(heartbeatMs);
  }

  /** Sin estado de autenticación la conexión sigue: el próximo latido vuelve a consultar. */
  private revoked(): Promise<boolean> {
    return this.revocations
      .revokedSince(this.session.principal, this.openedAt)
      .catch((error: unknown) => {
        this.report('revocation check failed', error);
        return false;
      });
  }

  /** La marca dura dos latidos: si se pierde uno, el usuario no aparece desconectado. */
  private async announce(heartbeatMs: number): Promise<void> {
    await this.presence
      .connected(this.session.channel, this.id, 2 * heartbeatMs)
      .catch((error: unknown) => this.report('presence update failed', error));
  }

  private report(message: string, error: unknown): void {
    this.logger.warn(message, {
      connectionId: this.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
