import type { MessageDefinition } from '../contracts/message-contract.js';

/** Metadatos que `@Subscribe` deja en un método y que `MessagingExplorer` lee. */
export class SubscribeMetadata {
  static readonly KEY = Symbol('platform.messaging.subscribe');

  /** Contrato al que se suscribe `method`, o `undefined` si no está decorado. */
  static contractOf(method: unknown): MessageDefinition | undefined {
    if (typeof method !== 'function') {
      return undefined;
    }
    return Reflect.getMetadata(SubscribeMetadata.KEY, method) as
      MessageDefinition | undefined;
  }
}
