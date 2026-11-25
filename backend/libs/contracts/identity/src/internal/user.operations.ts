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
 * Suspends a user. Its reversal reactivates the account; the operation is
 * idempotent because a saga can repeat it.
 */
export const SuspendUserOperation = defineOperation({
  id: IdentityOperation.SuspendUser,
  input: SuspendUserInputSchema,
  output: UserOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.ReactivateUser,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Suspends a user and revokes their sessions.',
});

/** Reactivates a suspended user. Its reversal is to suspend them again. */
export const ReactivateUserOperation = defineOperation({
  id: IdentityOperation.ReactivateUser,
  input: ReactivateUserInputSchema,
  output: UserOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.SuspendUser,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Reactivates a suspended user.',
});

/** Reads a user's profile. It does not modify data, so it declares no compensation. */
export const GetUserProfileOperation = defineOperation({
  id: IdentityOperation.GetUserProfile,
  input: GetUserProfileInputSchema,
  output: UserProfileSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Returns the profile of a user.',
});
