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
    'Cambio de contraseña con la contraseña actual.',
  ) satisfies z.ZodType<ChangePasswordRequest>;

export const PasswordResetRequestSchema = z
  .strictObject({ email: EmailFieldSchema })
  .describe(
    'Pedido de un correo para restablecer la contraseña.',
  ) satisfies z.ZodType<PasswordResetRequest>;

export const PasswordResetConfirmRequestSchema = z
  .strictObject({
    token: ActionTokenFieldSchema,
    newPassword: PasswordFieldSchema,
  })
  .describe(
    'Restablecimiento de la contraseña con el token del correo.',
  ) satisfies z.ZodType<PasswordResetConfirmRequest>;
