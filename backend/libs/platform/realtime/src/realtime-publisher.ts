import { PresenceTracker } from './presence/presence-tracker.js';
import type { RealtimeFrame } from './stream/realtime-frame.js';
import { RealtimeStream } from './stream/realtime-stream.js';

/**
 * Entrada del servicio que decide qué enviar: escribe en el stream del usuario y responde si tiene una
 * conexión abierta. No sabe qué transportes atienden ni en qué proceso corren.
 */
export class RealtimePublisher {
  constructor(
    private readonly stream: RealtimeStream,
    private readonly presence: PresenceTracker,
  ) {}

  publish(userId: string, frame: RealtimeFrame): Promise<string> {
    return this.stream.append(userId, frame);
  }

  isOnline(userId: string): Promise<boolean> {
    return this.presence.isOnline(userId);
  }
}
