import type { MessageDefinition } from '../contracts/message-contract.js';

/** Metadata that `@Subscribe` leaves on a method and that `MessagingExplorer` reads. */
export class SubscribeMetadata {
  static readonly KEY = Symbol('platform.messaging.subscribe');

  /** Contract `method` subscribes to, or `undefined` if it is not decorated. */
  static contractOf(method: unknown): MessageDefinition | undefined {
    if (typeof method !== 'function') {
      return undefined;
    }
    return Reflect.getMetadata(SubscribeMetadata.KEY, method) as
      MessageDefinition | undefined;
  }
}
