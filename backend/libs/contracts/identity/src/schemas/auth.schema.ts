import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import {
  AuthMethodReference,
  MfaFactor,
  SignInStatus,
} from '../enums/auth.enum.js';
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
import { DeviceSignatureSchema } from './device.schema.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

const SessionTokenFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.tokenMaxLength);

export const MfaTokenFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.mfaTokenMaxLength);

export const MfaCodeFieldSchema = z
  .string()
  .min(IdentityLimits.mfaCodeMinLength)
  .max(IdentityLimits.mfaCodeMaxLength)
  .regex(/^[A-Za-z0-9-]+$/);

export const MfaFactorSchema = z
  .enum(MfaFactor)
  .describe('Second factor method.') satisfies z.ZodType<MfaFactor>;

export const AuthMethodReferenceSchema = z
  .enum(AuthMethodReference)
  .describe(
    'Method with which the session was authenticated (amr).',
  ) satisfies z.ZodType<AuthMethodReference>;

export const SignInStatusSchema = z
  .enum(SignInStatus)
  .describe('Result of a sign-in.') satisfies z.ZodType<SignInStatus>;

export const SignInRequestSchema = z
  .strictObject({
    email: z.email().max(IdentityLimits.emailMaxLength),
    password: z.string().min(1).max(IdentityLimits.passwordMaxLength),
    device: DeviceSignatureSchema.optional(),
  })
  .describe(
    'Sign-in with email and password.',
  ) satisfies z.ZodType<SignInRequest>;

export const SessionTokensSchema = z
  .object({
    accessToken: z.string().min(1).max(IdentityLimits.tokenMaxLength),
    accessExpiresAt: TimestampSchema,
    sessionToken: SessionTokenFieldSchema.optional(),
  })
  .describe('Tokens of a session.') satisfies z.ZodType<SessionTokens>;

export const PendingMfaSchema = z
  .object({
    mfaToken: MfaTokenFieldSchema,
    methods: z.array(MfaFactorSchema).min(1),
  })
  .describe('Pending MFA challenge.') satisfies z.ZodType<PendingMfa>;

export const SignInResponseSchema = z
  .object({
    status: SignInStatusSchema,
    tokens: SessionTokensSchema.optional(),
    mfa: PendingMfaSchema.optional(),
    region: z.string().min(1).max(IdentityLimits.regionMaxLength).optional(),
    apiBaseUrl: z
      .string()
      .min(1)
      .max(IdentityLimits.apiBaseUrlMaxLength)
      .regex(/^https?:\/\//)
      .optional(),
  })
  .describe(
    'Result of a sign-in or of an MFA verification.',
  ) satisfies z.ZodType<SignInResponse>;

export const MfaChallengeRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    method: MfaFactorSchema,
  })
  .describe(
    'Request for an MFA challenge.',
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
  .describe('MFA challenge created.') satisfies z.ZodType<MfaChallenge>;

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
    'Verification of an MFA challenge.',
  ) satisfies z.ZodType<MfaVerifyRequest>;

export const SessionTokenRequestSchema = z
  .strictObject({ sessionToken: SessionTokenFieldSchema.optional() })
  .describe(
    'Session token to rotate or close. On the web it is omitted and travels in the httpOnly cookie.',
  ) satisfies z.ZodType<SessionTokenRequest>;

export const StepUpVerifyRequestSchema = z
  .strictObject({
    mfaToken: MfaTokenFieldSchema,
    challengeId: IdSchema,
    code: MfaCodeFieldSchema,
  })
  .describe(
    'Verification of the step-up of an open session.',
  ) satisfies z.ZodType<StepUpVerifyRequest>;

export const StepUpResultSchema = z
  .object({
    tokens: SessionTokensSchema,
    mfaVerifiedAt: TimestampSchema,
  })
  .describe(
    'Verified step-up: new access token and last MFA of the session.',
  ) satisfies z.ZodType<StepUpResult>;
