import type { RevocationHandler } from './revocation-handler.js';

/** Immediate notices of each revoked session (`auth:revocations` channel). Delivery is at most once: the index covers what is lost. */
export abstract class AuthRevocationFeed {
  /** Returns the function that unsubscribes the handler. */
  abstract subscribe(handler: RevocationHandler): Promise<() => Promise<void>>;
}
