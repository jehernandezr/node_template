import { ErrorDescriptor } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import { PresenceTracker } from './presence/presence-tracker.js';
import type { RealtimeFrame } from './stream/realtime-frame.js';
import { RealtimeStream } from './stream/realtime-stream.js';

/**
 * Entry point of the service that decides what to send: writes to the user's stream and answers whether they have an
 * open connection. It does not know which transports serve or in which process they run. Real time is best effort:
 * when the stream or presence store fails, the frame is dropped and the user counts as offline, so the caller still
 * stores the notification and sends it through its other channels.
 */
export class RealtimePublisher {
  constructor(
    private readonly stream: RealtimeStream,
    private readonly presence: PresenceTracker,
    private readonly logger: LoggerPort,
  ) {}

  /**
   * Publishes a frame to a user's channel.
   * @param userId Recipient.
   * @param frame Frame to publish.
   * @returns The id of the frame, or `undefined` when the stream could not take it.
   */
  async publish(
    userId: string,
    frame: RealtimeFrame,
  ): Promise<string | undefined> {
    try {
      return await this.stream.append(userId, frame);
    } catch (error) {
      this.logger.warn('Realtime frame dropped: the stream is unavailable', {
        error: ErrorDescriptor.describe(error),
      });
      return undefined;
    }
  }

  /**
   * Tells whether a user has an open connection.
   * @param userId User to check.
   * @returns `true` when online; `false` also when presence cannot be read.
   */
  async isOnline(userId: string): Promise<boolean> {
    try {
      return await this.presence.isOnline(userId);
    } catch (error) {
      this.logger.warn('Presence unavailable: the user counts as offline', {
        error: ErrorDescriptor.describe(error),
      });
      return false;
    }
  }
}
