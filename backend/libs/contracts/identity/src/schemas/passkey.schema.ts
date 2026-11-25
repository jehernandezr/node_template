import { z } from 'zod';
import { IdSchema, pageOf, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import type {
  PasskeyMfaOptionsRequest,
  PasskeyMfaVerifyRequest,
  PasskeyOptions,
  PasskeyPage,
  PasskeySignInVerifyRequest,
  PasskeyStepUpOptionsRequest,
  PasskeyStepUpVerifyRequest,
  PasskeySummary,
  RegisterPasskeyRequest,
  RemovePasskeyRequest,
} from '../types/passkey.type.js';
import { MfaTokenFieldSchema } from './auth.schema.js';
import {
  DevicePublicKeyFieldSchema,
  DeviceSignatureSchema,
} from './device.schema.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** WebAuthn response in base64url, as the system delivers it. */
const PasskeyCredentialFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.passkeyCredentialMaxLength)
  .regex(BASE64URL);

const PasskeyNameFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.passkeyNameMaxLength);

export const PasskeyOptionsSchema = z
  .object({
    challengeId: IdSchema,
    optionsJson: z
      .string()
      .min(1)
      .max(IdentityLimits.passkeyOptionsMaxLength)
      .regex(BASE64URL),
  })
  .describe(
    'WebAuthn options and the challenge that identifies them.',
  ) satisfies z.ZodType<PasskeyOptions>;

export const PasskeySignInVerifyRequestSchema = z
  .strictObject({
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
    device: DeviceSignatureSchema.optional(),
  })
  .describe(
    'Verification of a passkey sign-in.',
  ) satisfies z.ZodType<PasskeySignInVerifyRequest>;

export const PasskeyMfaOptionsRequestSchema = z
  .strictObject({ mfaToken: MfaTokenFieldSchema })
  .describe(
    'Passkey options as the second factor of a pending sign-in.',
  ) satisfies z.ZodType<PasskeyMfaOptionsRequest>;

export const PasskeyMfaVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
    devicePublicKey: DevicePublicKeyFieldSchema.optional(),
  })
  .describe(
    'Passkey verification as the second factor of a pending sign-in.',
  ) satisfies z.ZodType<PasskeyMfaVerifyRequest>;

export const PasskeyStepUpOptionsRequestSchema = z
  .strictObject({ mfaToken: MfaTokenFieldSchema })
  .describe(
    'Passkey options for the step-up of an open session.',
  ) satisfies z.ZodType<PasskeyStepUpOptionsRequest>;

export const PasskeyStepUpVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
  })
  .describe(
    'Passkey verification for the step-up of an open session.',
  ) satisfies z.ZodType<PasskeyStepUpVerifyRequest>;

export const PasskeySummarySchema = z
  .object({
    id: IdSchema,
    name: PasskeyNameFieldSchema,
    createdAt: TimestampSchema,
    lastUsedAt: TimestampSchema.nullable(),
    backedUp: z.boolean(),
  })
  .describe(
    'Registered passkey of the user.',
  ) satisfies z.ZodType<PasskeySummary>;

export const PasskeyPageSchema = pageOf(
  PasskeySummarySchema,
  'Page of passkeys.',
) satisfies z.ZodType<PasskeyPage>;

export const RegisterPasskeyRequestSchema = z
  .strictObject({
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
    name: PasskeyNameFieldSchema,
  })
  .describe(
    'Registration of a passkey with the authenticator response.',
  ) satisfies z.ZodType<RegisterPasskeyRequest>;

export const RemovePasskeyRequestSchema = z
  .strictObject({ passkeyId: IdSchema })
  .describe('Passkey to remove.') satisfies z.ZodType<RemovePasskeyRequest>;
