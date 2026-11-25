import { z } from 'zod';
import type {
  ChangePasswordRequest,
  PasswordResetConfirmRequest,
  PasswordResetRequest,
} from '../types/password.type.js';
import {
  ActionTokenFieldSchema,
  EmailFieldSchema,
  PasswordFieldSchema,
} from './user.schema.js';

export const ChangePasswordRequestSchema = z
  .strictObject({
    currentPassword: PasswordFieldSchema,
    newPassword: PasswordFieldSchema,
  })
  .describe(
    'Password change with the current password.',
  ) satisfies z.ZodType<ChangePasswordRequest>;

export const PasswordResetRequestSchema = z
  .strictObject({ email: EmailFieldSchema })
  .describe(
    'Request for a password reset email.',
  ) satisfies z.ZodType<PasswordResetRequest>;

export const PasswordResetConfirmRequestSchema = z
  .strictObject({
    token: ActionTokenFieldSchema,
    newPassword: PasswordFieldSchema,
  })
  .describe(
    'Password reset with the emailed token.',
  ) satisfies z.ZodType<PasswordResetConfirmRequest>;
