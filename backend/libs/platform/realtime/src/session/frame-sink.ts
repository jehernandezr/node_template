import type { StoredFrame } from '../stream/realtime-frame.js';

/** Hacia dónde salen las tramas de una conexión: la respuesta SSE o el socket. */
export interface FrameSink {
  /** La conexión ya tiene su posición en el stream: lo que se publique desde ahora le llega. */
  ready(): void;
  send(frame: StoredFrame): void;
  /** Señal de vida para que un proxy no corte la conexión por inactividad; los transportes con ping propio no hacen nada. */
  keepAlive(): void;
  close(): void;
}
