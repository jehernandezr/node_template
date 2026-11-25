import type { PushTarget } from '@contracts/identity';
import type { PushMessage } from './push-message.js';

/** Push provider for a platform (APNs, FCM, Web Push). */
export abstract class PushSender {
  /** Returns the id the provider assigns to the send. */
  abstract send(target: PushTarget, message: PushMessage): Promise<string>;
}
