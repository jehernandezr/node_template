import { TokenAudience } from '@contracts/identity';
import {
  ApiKeyAuthenticator,
  AccessTokenVerifier,
  AuthenticationError,
  type Actor,
} from '@platform/auth';
import { AuthMethod } from './auth-method.enum.js';
import { BearerTokenReader } from './bearer-token-reader.js';

/** Authenticates the `Authorization` of a request with the methods the route accepts. */
export class RequestAuthenticator {
  constructor(
    private readonly verifier: AccessTokenVerifier,
    private readonly apiKeys: ApiKeyAuthenticator,
    private readonly audience: TokenAudience,
  ) {}

  /**
   * Authenticates a request with the methods the route accepts.
   * @param authorization `Authorization` header.
   * @param methods Accepted methods.
   * @returns The actor.
   * @throws AuthenticationError if the token is missing, if it is a session token (which never authenticates a
   *   route), or if the token's method is not among the ones the route accepts.
   */
  async authenticate(
    authorization: string | string[] | undefined,
    methods: readonly AuthMethod[],
  ): Promise<Actor> {
    const token = BearerTokenReader.read(authorization);
    if (token === undefined) {
      throw AuthenticationError.unauthenticated('missing credentials');
    }
    if (BearerTokenReader.isSessionToken(token)) {
      throw AuthenticationError.unauthenticated('session token not accepted');
    }
    if (BearerTokenReader.isApiKey(token)) {
      if (!methods.includes(AuthMethod.ApiKey)) {
        throw AuthenticationError.unauthenticated('api key not accepted');
      }
      return this.apiKeys.authenticate(token);
    }
    if (!methods.includes(AuthMethod.Jwt)) {
      throw AuthenticationError.unauthenticated('access token not accepted');
    }
    return this.verifier.verify(token, { audience: this.audience });
  }
}
