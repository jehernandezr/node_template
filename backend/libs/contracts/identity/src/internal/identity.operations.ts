import { Compensation, defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  GetUserAccessInputSchema,
  RevokedSessionsSchema,
  RevokeUserSessionsInputSchema,
  UserAccessSchema,
} from '../schemas/session.schema.js';

/** Revokes all of a user's sessions. Used by backoffice and the security sagas. */
export const RevokeUserSessionsOperation = defineOperation({
  id: IdentityOperation.RevokeUserSessions,
  input: RevokeUserSessionsInputSchema,
  output: RevokedSessionsSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Revoking sessions is not undone for security: the user signs in again.',
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Revokes all sessions of a user and publishes the event.',
});

/** Reads a user's effective access in a tenant. */
export const GetUserAccessOperation = defineOperation({
  id: IdentityOperation.GetUserAccess,
  input: GetUserAccessInputSchema,
  output: UserAccessSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.UserNotFound],
  description:
    'Returns permissions, roles, features and flags of a user in a tenant.',
});
