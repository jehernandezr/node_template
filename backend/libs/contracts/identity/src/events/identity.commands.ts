import { defineCommand } from '@contracts/platform';
import { IdentityCommand } from '../enums/identifiers.enum.js';
import { PasswordResetRequestSchema } from '../schemas/password.schema.js';

/**
 * Identity sends it to itself through the outbox for every password reset request, whether or not the email
 * belongs to an account: the request answers the same in every case and the email goes out from the worker.
 */
export const SendPasswordResetCommand = defineCommand({
  type: IdentityCommand.SendPasswordReset,
  payload: PasswordResetRequestSchema,
  description:
    'Looks up the account of the email and, if it can reset its password, sends it the reset email.',
});
