import type { RealtimeTransport } from '../realtime-transport.js';

/** The process's enabled transports; empty when the service only publishes. */
export class RealtimeTransports {
  constructor(readonly all: readonly RealtimeTransport[]) {}
}
