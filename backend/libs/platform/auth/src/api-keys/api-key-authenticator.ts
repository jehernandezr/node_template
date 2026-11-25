import type { ServiceAccountActor } from '../actor/actor.js';

/** Authenticates a raw API key. */
export abstract class ApiKeyAuthenticator {
  /**
   * @throws AuthenticationError (`PLATFORM.AUTH.UNAUTHENTICATED`) if the format, the secret or the validity period are not valid.
   */
  abstract authenticate(rawKey: string): Promise<ServiceAccountActor>;
}
