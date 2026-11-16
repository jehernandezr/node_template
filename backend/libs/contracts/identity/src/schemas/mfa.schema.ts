import { z } from 'zod';
import { TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import type {
  MfaRecoveryConfirmRequest,
  MfaRecoveryStarted,
  MfaRecoveryStartRequest,
  RecoveryCodes,
  TotpConfirmRequest,
  TotpEnrollment,
} from '../types/mfa.type.js';
import { MfaTokenFieldSchema } from './auth.schema.js';
import { DevicePublicKeyFieldSchema } from './device.schema.js';
import { ActionTokenFieldSchema } from './user.schema.js';

export const TotpEnrollmentSchema = z
  .object({
    secret: z.string().min(1).max(IdentityLimits.totpSecretMaxLength),
    otpauthUri: z.string().min(1).max(IdentityLimits.otpauthUriMaxLength),
  })
  .describe(
    'Secreto TOTP y URI para la app autenticadora.',
  ) satisfies z.ZodType<TotpEnrollment>;

export const TotpConfirmRequestSchema = z
  .strictObject({
    code: z
      .string()
      .min(IdentityLimits.totpCodeMinLength)
      .max(IdentityLimits.totpCodeMaxLength)
      .regex(/^[0-9]+$/),
  })
  .describe(
    'Primer código de la app autenticadora para confirmar el TOTP.',
  ) satisfies z.ZodType<TotpConfirmRequest>;

export const RecoveryCodesSchema = z
  .object({
    codes: z
      .array(
        z
          .string()
          .min(IdentityLimits.recoveryCodeMinLength)
          .max(IdentityLimits.recoveryCodeMaxLength),
      )
      .max(IdentityLimits.recoveryCodesMax),
  })
  .describe(
    'Códigos de recuperación, que se muestran una sola vez.',
  ) satisfies z.ZodType<RecoveryCodes>;

export const MfaRecoveryStartRequestSchema = z
  .strictObject({ mfaToken: MfaTokenFieldSchema })
  .describe(
    'Inicio de la recuperación de una cuenta sin factores disponibles.',
  ) satisfies z.ZodType<MfaRecoveryStartRequest>;

export const MfaRecoveryStartedSchema = z
  .object({ availableAt: TimestampSchema })
  .describe('Recuperación iniciada.') satisfies z.ZodType<MfaRecoveryStarted>;

export const MfaRecoveryConfirmRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    token: ActionTokenFieldSchema,
    devicePublicKey: DevicePublicKeyFieldSchema.optional(),
  })
  .describe(
    'Confirmación de la recuperación con el token enviado por email.',
  ) satisfies z.ZodType<MfaRecoveryConfirmRequest>;
