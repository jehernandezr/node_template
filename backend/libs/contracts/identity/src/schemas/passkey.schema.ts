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
import { DevicePublicKeyFieldSchema } from './device.schema.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Respuesta de WebAuthn en base64url, tal como la entrega el sistema. */
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
    'Opciones de WebAuthn y el desafío que las identifica.',
  ) satisfies z.ZodType<PasskeyOptions>;

export const PasskeySignInVerifyRequestSchema = z
  .strictObject({
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
    deviceId: z
      .string()
      .min(1)
      .max(IdentityLimits.deviceIdMaxLength)
      .optional(),
  })
  .describe(
    'Verificación de un inicio de sesión con passkey.',
  ) satisfies z.ZodType<PasskeySignInVerifyRequest>;

export const PasskeyMfaOptionsRequestSchema = z
  .strictObject({ mfaToken: MfaTokenFieldSchema })
  .describe(
    'Opciones de passkey como segundo factor de un login pendiente.',
  ) satisfies z.ZodType<PasskeyMfaOptionsRequest>;

export const PasskeyMfaVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
    devicePublicKey: DevicePublicKeyFieldSchema.optional(),
  })
  .describe(
    'Verificación de passkey como segundo factor de un login pendiente.',
  ) satisfies z.ZodType<PasskeyMfaVerifyRequest>;

export const PasskeyStepUpOptionsRequestSchema = z
  .strictObject({ mfaToken: MfaTokenFieldSchema })
  .describe(
    'Opciones de passkey para el paso adicional de una sesión abierta.',
  ) satisfies z.ZodType<PasskeyStepUpOptionsRequest>;

export const PasskeyStepUpVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
  })
  .describe(
    'Verificación de passkey para el paso adicional de una sesión abierta.',
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
    'Passkey registrada del usuario.',
  ) satisfies z.ZodType<PasskeySummary>;

export const PasskeyPageSchema = pageOf(
  PasskeySummarySchema,
  'Página de passkeys.',
) satisfies z.ZodType<PasskeyPage>;

export const RegisterPasskeyRequestSchema = z
  .strictObject({
    challengeId: IdSchema,
    credentialJson: PasskeyCredentialFieldSchema,
    name: PasskeyNameFieldSchema,
  })
  .describe(
    'Registro de una passkey con la respuesta del autenticador.',
  ) satisfies z.ZodType<RegisterPasskeyRequest>;

export const RemovePasskeyRequestSchema = z
  .strictObject({ passkeyId: IdSchema })
  .describe('Passkey a quitar.') satisfies z.ZodType<RemovePasskeyRequest>;
