import { TokenAudience } from '@contracts/identity';
import {
  ApiKeyAuthenticator,
  AccessTokenVerifier,
  AuthenticationError,
  type Actor,
} from '@platform/auth';
import { AuthMethod } from './auth-method.enum.js';
import { BearerTokenReader } from './bearer-token-reader.js';

/** Autentica el `Authorization` de una petición con los métodos que la ruta acepta. */
export class RequestAuthenticator {
  constructor(
    private readonly verifier: AccessTokenVerifier,
    private readonly apiKeys: ApiKeyAuthenticator,
    private readonly audience: TokenAudience,
  ) {}

  /**
   * @throws AuthenticationError si falta el token, si es un session token (que nunca autentica una
   *   ruta), o si el método del token no está entre los que acepta la ruta.
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
