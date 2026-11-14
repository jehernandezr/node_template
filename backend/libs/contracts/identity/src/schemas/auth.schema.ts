import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import { MfaFactor, SignInStatus } from '../enums/auth.enum.js';
import type {
  MfaChallenge,
  MfaChallengeRequest,
  MfaVerifyRequest,
  PendingMfa,
  SessionTokenRequest,
  SessionTokens,
  SignInRequest,
  SignInResponse,
  StepUpResult,
  StepUpVerifyRequest,
} from '../types/auth.type.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

const SessionTokenFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.tokenMaxLength);

const MfaTokenFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.mfaTokenMaxLength);

const MfaCodeFieldSchema = z
  .string()
  .min(IdentityLimits.mfaCodeMinLength)
  .max(IdentityLimits.mfaCodeMaxLength)
  .regex(/^[A-Za-z0-9-]+$/);

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
    sessionToken: SessionTokenFieldSchema.optional(),
  })
  .describe('Tokens de una sesión.') satisfies z.ZodType<SessionTokens>;

export const PendingMfaSchema = z
  .object({
    mfaToken: MfaTokenFieldSchema,
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

export const MfaChallengeRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    method: MfaFactorSchema,
  })
  .describe(
    'Pedido de un desafío MFA.',
  ) satisfies z.ZodType<MfaChallengeRequest>;

export const MfaChallengeSchema = z
  .object({
    challengeId: IdSchema,
    method: MfaFactorSchema,
    expiresAt: TimestampSchema,
    codeLength: z
      .int()
      .min(IdentityLimits.mfaCodeMinLength)
      .max(IdentityLimits.mfaCodeMaxLength)
      .optional(),
  })
  .describe('Desafío MFA creado.') satisfies z.ZodType<MfaChallenge>;

export const MfaVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    code: MfaCodeFieldSchema,
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

export const SessionTokenRequestSchema = z
  .strictObject({ sessionToken: SessionTokenFieldSchema.optional() })
  .describe(
    'Session token a rotar o cerrar. En web se omite y viaja en la cookie httpOnly.',
  ) satisfies z.ZodType<SessionTokenRequest>;

export const StepUpVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    code: MfaCodeFieldSchema,
  })
  .describe(
    'Verificación del paso adicional de una sesión abierta.',
  ) satisfies z.ZodType<StepUpVerifyRequest>;

export const StepUpResultSchema = z
  .object({
    tokens: SessionTokensSchema,
    mfaVerifiedAt: TimestampSchema,
  })
  .describe(
    'Paso adicional verificado: access token nuevo y último MFA de la sesión.',
  ) satisfies z.ZodType<StepUpResult>;
