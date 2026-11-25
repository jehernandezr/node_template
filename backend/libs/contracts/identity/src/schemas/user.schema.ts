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
 * Password in the request. The policy (minimum length, leaked passwords)
 * is applied by the server, which responds with its codes, so here only the
 * maximum length is bounded.
 */
export const PasswordFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.passwordMaxLength);

const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

export const UserStatusSchema = z
  .enum(UserStatus)
  .describe('Status of a user account.') satisfies z.ZodType<UserStatus>;

export const SecurityAlertTypeSchema = z
  .enum(SecurityAlertType)
  .describe(
    'Security alert on an account.',
  ) satisfies z.ZodType<SecurityAlertType>;

/** Email with the contract's maximum length. */
export const EmailFieldSchema = z.email().max(IdentityLimits.emailMaxLength);

/** Single-use token that arrives by email or by invitation. */
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
    'Registration of a user with email, password, name and language.',
  ) satisfies z.ZodType<SignUpRequest>;

export const EmailVerificationRequestSchema = z
  .strictObject({ email: EmailFieldSchema })
  .describe(
    'Request for a verification email.',
  ) satisfies z.ZodType<EmailVerificationRequest>;

export const EmailVerificationConfirmRequestSchema = z
  .strictObject({ token: ActionTokenFieldSchema })
  .describe(
    'Confirmation of the email verification.',
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
  .describe(
    'Profile of the authenticated user.',
  ) satisfies z.ZodType<UserProfile>;

export const UpdateProfileRequestSchema = z
  .strictObject({
    displayName: DisplayNameFieldSchema.optional(),
    locale: LocaleFieldSchema.optional(),
  })
  .describe(
    'Partial changes of the profile.',
  ) satisfies z.ZodType<UpdateProfileRequest>;

export const EmailChangeRequestSchema = z
  .strictObject({ newEmail: EmailFieldSchema })
  .describe(
    'Request to change the email to a new address.',
  ) satisfies z.ZodType<EmailChangeRequest>;

export const EmailChangeConfirmRequestSchema = z
  .strictObject({ token: ActionTokenFieldSchema })
  .describe(
    'Confirmation of the email change.',
  ) satisfies z.ZodType<EmailChangeConfirmRequest>;

export const SuspendUserInputSchema = z
  .strictObject({
    userId: IdSchema,
    reason: z.string().min(1).max(IdentityLimits.reasonMaxLength).optional(),
  })
  .describe(
    'Suspends a user and revokes their sessions.',
  ) satisfies z.ZodType<SuspendUserInput>;

export const ReactivateUserInputSchema = z
  .strictObject({ userId: IdSchema })
  .describe(
    'Reactivates a suspended user.',
  ) satisfies z.ZodType<ReactivateUserInput>;

export const UserOperationResultSchema = z
  .object({ userId: IdSchema, status: UserStatusSchema })
  .describe(
    'Result of suspending or reactivating a user.',
  ) satisfies z.ZodType<UserOperationResult>;

export const GetUserProfileInputSchema = z
  .strictObject({ userId: IdSchema })
  .describe('User to query.') satisfies z.ZodType<GetUserProfileInput>;
