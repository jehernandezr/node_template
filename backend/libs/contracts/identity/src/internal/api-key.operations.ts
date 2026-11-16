import { defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  ApiKeyPrincipalSchema,
  AuthenticateApiKeyInputSchema,
} from '../schemas/api-key.schema.js';

/** Valida una API key y devuelve su principal. Solo lee, así que no declara compensación. */
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
  description: 'Valida una API key y devuelve su principal.',
});
