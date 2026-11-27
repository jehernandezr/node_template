import type { PushTarget } from '@contracts/identity';
import type { PushMessage } from './push-message.js';

/** Push provider for a platform (APNs, FCM, Web Push). */
export abstract class PushSender {
  /**
   * Sends the push to one device.
   * @param target Device token and platform.
   * @param message Push title and body.
   * @returns The id the provider assigns to the send, or `undefined` if the sender delivers nothing.
   */
  abstract send(
    target: PushTarget,
    message: PushMessage,
  ): Promise<string | undefined>;
}
