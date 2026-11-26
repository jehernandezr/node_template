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

/** api-keys internal operations: the other services use them to validate a key. */
@Injectable()
export class ApiKeysInternalOperations {
  constructor(private readonly authenticate: AuthenticateApiKey) {}

  /**
   * Internal operation that authenticates an API key for another service.
   * @param input Prefix, secret hash and client IP.
   * @returns The principal of the key, or the business error.
   */
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
