import type { ReceivedFrame } from './received-frame.js';

/** Lo que una prueba de transporte ve de un cliente conectado, sea SSE o Socket.IO. */
export interface RealtimeClient {
  readonly frames: readonly ReceivedFrame[];
  /** El servidor lo rechazó al conectar. */
  readonly rejected: boolean;
  /** El servidor cerró la conexión. */
  readonly closedByServer: boolean;
  lastEventId(): string | undefined;
  close(): void;
}

/** Abre un cliente contra el servidor de la prueba con un token y, para reanudar, el último id visto. */
export type RealtimeClientOpener = (
  baseUrl: string,
  token: string,
  lastEventId?: string,
) => Promise<RealtimeClient>;
