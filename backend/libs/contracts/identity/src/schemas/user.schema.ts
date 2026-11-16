import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { SecurityAlertType, UserStatus } from '../enums/user.enum.js';
import type {
  EmailChangeConfirmRequest,
  EmailChangeRequest,
  EmailVerificationConfirmRequest,
  EmailVerificationRequest,
  GetUserProfileInput,
  ReactivateUserInput,
  SignUpRequest,
  SuspendUserInput,
  UpdateProfileRequest,
  UserOperationResult,
  UserProfile,
} from '../types/user.type.js';

/**
 * Contraseña en la petición. La política (largo mínimo, contraseñas filtradas)
 * la aplica el servidor y responde sus códigos, así que aquí solo se acota el
 * largo máximo.
 */
export const PasswordFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.passwordMaxLength);

const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export const UserStatusSchema = z
  .enum(UserStatus)
  .describe(
    'Estado de la cuenta de un usuario.',
  ) satisfies z.ZodType<UserStatus>;

export const SecurityAlertTypeSchema = z
  .enum(SecurityAlertType)
  .describe(
    'Alerta de seguridad sobre una cuenta.',
  ) satisfies z.ZodType<SecurityAlertType>;

/** Email con el largo máximo del contrato. */
export const EmailFieldSchema = z.email().max(IdentityLimits.emailMaxLength);

/** Token de un solo uso que llega por email o por invitación. */
export const ActionTokenFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.actionTokenMaxLength);

const DisplayNameFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.displayNameMaxLength);

const LocaleFieldSchema = z
  .string()
  .min(IdentityLimits.localeMinLength)
  .max(IdentityLimits.localeMaxLength)
  .regex(LOCALE_PATTERN);

export const SignUpRequestSchema = z
  .strictObject({
    email: EmailFieldSchema,
    password: PasswordFieldSchema,
    displayName: DisplayNameFieldSchema,
    locale: LocaleFieldSchema,
    invitationToken: ActionTokenFieldSchema.optional(),
  })
  .describe(
    'Alta de un usuario con email, contraseña, nombre e idioma.',
  ) satisfies z.ZodType<SignUpRequest>;

export const EmailVerificationRequestSchema = z
  .strictObject({ email: EmailFieldSchema })
  .describe(
    'Pedido de un email de verificación.',
  ) satisfies z.ZodType<EmailVerificationRequest>;

export const EmailVerificationConfirmRequestSchema = z
  .strictObject({ token: ActionTokenFieldSchema })
  .describe(
    'Confirmación de la verificación del email.',
  ) satisfies z.ZodType<EmailVerificationConfirmRequest>;

export const UserProfileSchema = z
  .object({
    id: IdSchema,
    email: EmailFieldSchema,
    emailVerifiedAt: TimestampSchema.nullable(),
    displayName: DisplayNameFieldSchema,
    locale: LocaleFieldSchema,
    status: UserStatusSchema,
    homeTenantId: IdSchema,
    lastTenantId: IdSchema.nullable(),
  })
  .describe('Perfil del usuario autenticado.') satisfies z.ZodType<UserProfile>;

export const UpdateProfileRequestSchema = z
  .strictObject({
    displayName: DisplayNameFieldSchema.optional(),
    locale: LocaleFieldSchema.optional(),
  })
  .describe(
    'Cambios parciales del perfil.',
  ) satisfies z.ZodType<UpdateProfileRequest>;

export const EmailChangeRequestSchema = z
  .strictObject({ newEmail: EmailFieldSchema })
  .describe(
    'Pedido de cambio de email a una dirección nueva.',
  ) satisfies z.ZodType<EmailChangeRequest>;

export const EmailChangeConfirmRequestSchema = z
  .strictObject({ token: ActionTokenFieldSchema })
  .describe(
    'Confirmación del cambio de email.',
  ) satisfies z.ZodType<EmailChangeConfirmRequest>;

export const SuspendUserInputSchema = z
  .strictObject({
    userId: IdSchema,
    reason: z.string().min(1).max(IdentityLimits.reasonMaxLength).optional(),
  })
  .describe(
    'Suspende a un usuario y revoca sus sesiones.',
  ) satisfies z.ZodType<SuspendUserInput>;

export const ReactivateUserInputSchema = z
  .strictObject({ userId: IdSchema })
  .describe(
    'Reactiva a un usuario suspendido.',
  ) satisfies z.ZodType<ReactivateUserInput>;

export const UserOperationResultSchema = z
  .object({ userId: IdSchema, status: UserStatusSchema })
  .describe(
    'Resultado de suspender o reactivar a un usuario.',
  ) satisfies z.ZodType<UserOperationResult>;

export const GetUserProfileInputSchema = z
  .strictObject({ userId: IdSchema })
  .describe('Usuario a consultar.') satisfies z.ZodType<GetUserProfileInput>;
