import type { PushTarget } from '@contracts/identity';
import type { PushMessage } from './push-message.js';

/** Push provider for a platform (APNs, FCM, Web Push). */
export abstract class PushSender {
  /**
   * Returns the id the provider assigns to the send.
   * @param target Device token and platform.
   * @param message Push title and body.
   * @returns The provider id.
   */
  abstract send(target: PushTarget, message: PushMessage): Promise<string>;
}
