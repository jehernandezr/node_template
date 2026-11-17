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
 * Resuelve las API keys que llegan a las rutas de identity sin pasar por la API interna, con la IP del
 * cliente de la petición. Una key que no vale es `undefined`: el autenticador de la plataforma responde por
 * ella.
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
