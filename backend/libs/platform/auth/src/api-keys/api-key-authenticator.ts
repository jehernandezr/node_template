import type { ServiceAccountActor } from '../actor/actor.js';

/** Authenticates a raw API key. */
export abstract class ApiKeyAuthenticator {
  /**
   * Authenticates an API key and returns its service account actor.
   * @param rawKey Full key from the header.
   * @returns The actor.
   * @throws AuthenticationError (`PLATFORM.AUTH.UNAUTHENTICATED`) if the format, the secret or the validity period are not valid.
   */
  abstract authenticate(rawKey: string): Promise<ServiceAccountActor>;
}
