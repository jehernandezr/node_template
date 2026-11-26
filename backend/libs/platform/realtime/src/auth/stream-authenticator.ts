import type { StreamCredentials } from './stream-credentials.js';
import type { StreamPrincipal } from './stream-principal.js';

/** Authenticates a realtime connection. */
export abstract class StreamAuthenticator {
  /**
   * Authenticates a stream from its token or cookie.
   * @param credentials Token or cookie of the request.
   * @returns The principal of the stream.
   * @throws AuthenticationError if the credentials are missing or not valid.
   */
  abstract authenticate(
    credentials: StreamCredentials,
  ): Promise<StreamPrincipal>;
}
