import { z } from 'zod';
import { TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { MfaFactor, SignInStatus } from '../enums/auth.enum.js';
import type {
  MfaVerifyRequest,
  PendingMfa,
  SessionTokens,
  SignInRequest,
  SignInResponse,
} from '../types/auth.type.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

export const MfaFactorSchema = z
  .enum(MfaFactor)
  .describe('Método de segundo factor.') satisfies z.ZodType<MfaFactor>;

export const SignInStatusSchema = z
  .enum(SignInStatus)
  .describe(
    'Resultado de un inicio de sesión.',
  ) satisfies z.ZodType<SignInStatus>;

export const SignInRequestSchema = z
  .strictObject({
    email: z.email().max(IdentityLimits.emailMaxLength),
    password: z.string().min(1).max(IdentityLimits.passwordMaxLength),
    deviceId: z
      .string()
      .min(1)
      .max(IdentityLimits.deviceIdMaxLength)
      .optional(),
  })
  .describe(
    'Inicio de sesión con email y contraseña.',
  ) satisfies z.ZodType<SignInRequest>;

export const SessionTokensSchema = z
  .object({
    accessToken: z.string().min(1).max(IdentityLimits.tokenMaxLength),
    accessExpiresAt: TimestampSchema,
    sessionToken: z
      .string()
      .min(1)
      .max(IdentityLimits.tokenMaxLength)
      .optional(),
  })
  .describe('Tokens de una sesión.') satisfies z.ZodType<SessionTokens>;

export const PendingMfaSchema = z
  .object({
    mfaToken: z.string().min(1).max(IdentityLimits.mfaTokenMaxLength),
    methods: z.array(MfaFactorSchema).min(1),
  })
  .describe('Desafío MFA pendiente.') satisfies z.ZodType<PendingMfa>;

export const SignInResponseSchema = z
  .object({
    status: SignInStatusSchema,
    tokens: SessionTokensSchema.optional(),
    mfa: PendingMfaSchema.optional(),
  })
  .describe(
    'Resultado de un login o de una verificación MFA.',
  ) satisfies z.ZodType<SignInResponse>;

export const MfaVerifyRequestSchema = z
  .strictObject({
    mfaToken: z.string().min(1).max(IdentityLimits.mfaTokenMaxLength),
    method: MfaFactorSchema,
    code: z
      .string()
      .min(IdentityLimits.mfaCodeMinLength)
      .max(IdentityLimits.mfaCodeMaxLength)
      .regex(/^[A-Za-z0-9-]+$/),
    devicePublicKey: z
      .string()
      .min(1)
      .max(IdentityLimits.devicePublicKeyMaxLength)
      .regex(BASE64URL)
      .optional(),
  })
  .describe(
    'Verificación de un desafío MFA.',
  ) satisfies z.ZodType<MfaVerifyRequest>;
