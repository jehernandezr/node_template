import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  AuthenticateApiKeyOperation,
  type ApiKeyPrincipal,
  type AuthenticateApiKeyInput,
} from '@contracts/identity';
import { AuthenticateApiKey } from '../application/authenticate-api-key.use-case.js';

/** Operaciones internas de api-keys: la usan los demás servicios para validar una key. */
@Injectable()
export class ApiKeysInternalOperations {
  constructor(private readonly authenticate: AuthenticateApiKey) {}

  @InternalHandler(AuthenticateApiKeyOperation)
  async authenticateApiKey(
    input: AuthenticateApiKeyInput,
  ): Promise<HandlerResult<ApiKeyPrincipal>> {
    return {
      outcome: CallOutcome.success(
        await this.authenticate.execute(input.apiKey, input.clientIp),
      ),
    };
  }
}
