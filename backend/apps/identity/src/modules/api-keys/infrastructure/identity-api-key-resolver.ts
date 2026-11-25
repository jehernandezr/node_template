import { Injectable } from '@nestjs/common';
import { ApiKeyEnvironment as ContractApiKeyEnvironment } from '@contracts/identity';
import {
  ApiKeyEnvironment,
  ApiKeyResolver,
  type ApiKeyPrincipal,
} from '@platform/auth';
import { ClientIpContext } from '../../../auth/client-ip-context.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { AuthenticateApiKey } from '../application/authenticate-api-key.use-case.js';

/**
 * Resolves the API keys that reach identity's routes without going through the internal API, with the client IP
 * of the request. An invalid key is `undefined`: the platform authenticator responds for
 * it.
 */
@Injectable()
export class IdentityApiKeyResolver extends ApiKeyResolver {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly authenticate: AuthenticateApiKey,
    private readonly clientIp: ClientIpContext,
  ) {
    super();
  }

  async resolve(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    try {
      const principal = await this.authenticate.resolve(
        prefix,
        secretHash,
        this.clientIp.current(),
      );
      return {
        apiKeyId: principal.apiKeyId,
        serviceAccountId: principal.serviceAccountId,
        tenantId: principal.tenantId,
        environment:
          principal.environment === ContractApiKeyEnvironment.Live
            ? ApiKeyEnvironment.Live
            : ApiKeyEnvironment.Test,
        permissions: principal.permissions,
        ...(principal.expiresAt === null
          ? {}
          : {
              expiresAt: Math.floor(
                Date.parse(principal.expiresAt) /
                  IdentityApiKeyResolver.SECOND_MS,
              ),
            }),
      };
    } catch (error) {
      if (error instanceof IdentityError) {
        return undefined;
      }
      throw error;
    }
  }
}
