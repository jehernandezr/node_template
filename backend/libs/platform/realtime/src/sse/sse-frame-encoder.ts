import type { StoredFrame } from '../stream/realtime-frame.js';

/** Formato `text/event-stream`: el id permite reanudar con `Last-Event-ID`. Utilidad pura. */
export class SseFrameEncoder {
  /** Pausa que el navegador espera antes de reconectar. */
  static readonly RETRY_MS = 3000;

  static frame(frame: StoredFrame): string {
    return `id: ${frame.id}\nevent: ${frame.type}\ndata: ${JSON.stringify(frame.data)}\n\n`;
  }

  static preamble(): string {
    return `retry: ${SseFrameEncoder.RETRY_MS}\n\n`;
  }

  /** Comentario que el cliente ignora y que mantiene la conexión con tráfico. */
  static keepAlive(): string {
    return ': keep-alive\n\n';
  }
}
