import type { RealtimeHost } from './realtime-host.js';

/** Un transporte de tiempo real montado en el servidor HTTP del proceso. */
export abstract class RealtimeTransport {
  abstract attach(host: RealtimeHost): void;

  /** Cierra las conexiones abiertas; el servidor HTTP lo cierra su dueño. */
  abstract close(): Promise<void>;
}
