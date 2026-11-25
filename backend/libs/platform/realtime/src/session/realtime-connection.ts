import type { LoggerPort } from '@platform/observability';
import type { StreamRevocations } from '../auth/stream-revocations.js';
import type { PresenceTracker } from '../presence/presence-tracker.js';
import type { RealtimeSession } from './realtime-session.js';
import type { FrameSink } from './frame-sink.js';

/**
 * What lasts while a connection stays open: the user's presence, the keep-alive signal and the close when
 * its session expires or its tenant is revoked. Each heartbeat also rereads the stream, in case a new frame
 * notice was lost.
 */
export class RealtimeConnection {
  /** `setTimeout` fires immediately with a longer wait: a months-long session would close the connection on opening it. */
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

  /** If the session fails to open, the connection is closed and stops being announced before the error is propagated. */
  async start(heartbeatMs: number, closeInMs: number): Promise<void> {
    await this.announce(heartbeatMs);
    // Heartbeat of a live connection, not a job: it ends with the connection.
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

  /** Without authentication state the connection continues: the next heartbeat checks again. */
  private revoked(): Promise<boolean> {
    return this.revocations
      .revokedSince(this.session.principal, this.openedAt)
      .catch((error: unknown) => {
        this.report('revocation check failed', error);
        return false;
      });
  }

  /** The mark lasts two heartbeats: if one is lost, the user does not appear disconnected. */
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
