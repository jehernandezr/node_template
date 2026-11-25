import type { StreamCredentials } from './stream-credentials.js';
import type { StreamPrincipal } from './stream-principal.js';

/** Authenticates a realtime connection. */
export abstract class StreamAuthenticator {
  /** @throws AuthenticationError if the credentials are missing or not valid. */
  abstract authenticate(
    credentials: StreamCredentials,
  ): Promise<StreamPrincipal>;
}
