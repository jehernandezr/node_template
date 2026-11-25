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
    'TOTP secret and URI for the authenticator app.',
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
    'First code from the authenticator app to confirm the TOTP.',
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
    'Recovery codes, shown only once.',
  ) satisfies z.ZodType<RecoveryCodes>;

export const MfaRecoveryStartRequestSchema = z
  .strictObject({ mfaToken: MfaTokenFieldSchema })
  .describe(
    'Start of the recovery of an account without available factors.',
  ) satisfies z.ZodType<MfaRecoveryStartRequest>;

export const MfaRecoveryStartedSchema = z
  .object({ availableAt: TimestampSchema })
  .describe('Recovery started.') satisfies z.ZodType<MfaRecoveryStarted>;

export const MfaRecoveryConfirmRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    token: ActionTokenFieldSchema,
    devicePublicKey: DevicePublicKeyFieldSchema.optional(),
  })
  .describe(
    'Confirmation of the recovery with the token sent by email.',
  ) satisfies z.ZodType<MfaRecoveryConfirmRequest>;
