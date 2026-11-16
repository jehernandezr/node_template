import type { ServiceAccountActor } from '../actor/actor.js';

/** Autentica una API key cruda. */
export abstract class ApiKeyAuthenticator {
  /**
   * @throws AuthenticationError (`PLATFORM.AUTH.UNAUTHENTICATED`) si el formato, el secreto o la vigencia no son válidos.
   */
  abstract authenticate(rawKey: string): Promise<ServiceAccountActor>;
}
