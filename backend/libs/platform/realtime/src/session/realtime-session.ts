import type { LoggerPort } from '@platform/observability';
import type { StreamPrincipal } from '../auth/stream-principal.js';
import { RealtimeFrames, type StoredFrame } from '../stream/realtime-frame.js';
import type {
  RealtimeStream,
  StreamUnsubscribe,
} from '../stream/realtime-stream.js';
import type { FrameSink } from './frame-sink.js';

/**
 * Una conexión abierta de un usuario. Entrega primero lo que se perdió desde `lastEventId` y después cada
 * trama nueva del canal, siempre en orden y sin repetir: cada lectura parte del id de la última entregada.
 * Una trama con `closesSession` igual a la sesión de la conexión se entrega y cierra la conexión. Si el stream
 * falla a mitad de la entrega, la sesión se cierra: el cliente reconecta con el id de la última trama recibida
 * y no pierde ninguna.
 */
export class RealtimeSession {
  /** Tramas por lectura: acota la memoria de una reconexión que vuelve después de mucho tiempo. */
  private static readonly BATCH = 100;

  private lastId: string | undefined;
  private unsubscribe: StreamUnsubscribe | undefined;
  private draining: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(
    private readonly stream: RealtimeStream,
    readonly principal: StreamPrincipal,
    private readonly sink: FrameSink,
    private readonly lastEventId: string | undefined,
    private readonly logger: LoggerPort,
  ) {}

  get channel(): string {
    return this.principal.userId;
  }

  /** Sin `lastEventId`, o con uno que no es del stream, la conexión empieza en el final: lo anterior ya lo trae la API. */
  async open(): Promise<void> {
    this.lastId = await this.stream.resumePoint(this.channel, this.lastEventId);
    this.unsubscribe = await this.stream.subscribe(this.channel, () => {
      this.catchUp();
    });
    this.sink.ready();
    this.catchUp();
    await this.draining;
  }

  /**
   * Lee lo pendiente; las llamadas se encadenan para no entregar dos veces la misma trama. La cadena nunca
   * queda rechazada: lo llaman avisos y latidos que nadie espera.
   */
  catchUp(): void {
    this.draining = this.draining
      .then(() => this.drain())
      .catch((error: unknown) => this.fail(error));
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      await this.unsubscribe?.();
    } finally {
      this.sink.close();
    }
  }

  private async drain(): Promise<void> {
    while (!this.closed) {
      const frames = await this.stream.readAfter(
        this.channel,
        this.lastId,
        RealtimeSession.BATCH,
      );
      for (const frame of frames) {
        await this.deliver(frame);
        if (this.closed) {
          return;
        }
      }
      if (frames.length < RealtimeSession.BATCH) {
        return;
      }
    }
  }

  private async fail(error: unknown): Promise<void> {
    this.logger.warn('realtime delivery failed', {
      channel: this.channel,
      error: error instanceof Error ? error.message : String(error),
    });
    // Sin Valkey la suscripción tampoco se cancela; el aviso que llegue después encuentra la sesión cerrada.
    await this.close().catch(() => undefined);
  }

  private async deliver(frame: StoredFrame): Promise<void> {
    this.sink.send(frame);
    this.lastId = frame.id;
    if (
      frame.closesSession === this.principal.sessionId ||
      frame.closesSession === RealtimeFrames.ALL_SESSIONS
    ) {
      await this.close();
    }
  }
}
