import { defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  GetUserProfileInputSchema,
  ReactivateUserInputSchema,
  SuspendUserInputSchema,
  UserOperationResultSchema,
  UserProfileSchema,
} from '../schemas/user.schema.js';

/**
 * Suspende a un usuario. Su reversa reactiva la cuenta; la operación es
 * idempotente porque una saga puede repetirla.
 */
export const SuspendUserOperation = defineOperation({
  id: IdentityOperation.SuspendUser,
  input: SuspendUserInputSchema,
  output: UserOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.ReactivateUser,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Suspende a un usuario y revoca sus sesiones.',
});

/** Reactiva a un usuario suspendido. Su reversa es volver a suspenderlo. */
export const ReactivateUserOperation = defineOperation({
  id: IdentityOperation.ReactivateUser,
  input: ReactivateUserInputSchema,
  output: UserOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.SuspendUser,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Reactiva a un usuario suspendido.',
});

/** Lee el perfil de un usuario. No modifica datos, así que no declara compensación. */
export const GetUserProfileOperation = defineOperation({
  id: IdentityOperation.GetUserProfile,
  input: GetUserProfileInputSchema,
  output: UserProfileSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Devuelve el perfil de un usuario.',
});
