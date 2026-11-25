import { defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  ApiKeyPrincipalSchema,
  AuthenticateApiKeyInputSchema,
} from '../schemas/api-key.schema.js';

/** Validates an API key and returns its principal. It only reads, so it declares no compensation. */
export const AuthenticateApiKeyOperation = defineOperation({
  id: IdentityOperation.AuthenticateApiKey,
  input: AuthenticateApiKeyInputSchema,
  output: ApiKeyPrincipalSchema,
  idempotent: true,
  mutating: false,
  errors: [
    IdentityErrorCode.ApiKeyInvalid,
    IdentityErrorCode.ApiKeyExpired,
    IdentityErrorCode.ApiKeyIpNotAllowed,
    IdentityErrorCode.ServiceAccountDisabled,
    IdentityErrorCode.TenantSuspended,
  ],
  timeoutMs: 3000,
  description: 'Validates an API key and returns its principal.',
});
