import type { RealtimeTransport } from '../realtime-transport.js';

/** Los transportes encendidos del proceso; vacío cuando el servicio solo publica. */
export class RealtimeTransports {
  constructor(readonly all: readonly RealtimeTransport[]) {}
}
