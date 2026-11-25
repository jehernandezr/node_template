import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import type {
  ApprovalContext,
  DeviceApproval,
  DeviceApprovals,
  DenyDeviceApprovalRequest,
  DeviceSignatureFields,
  PullDeviceApprovalsRequest,
  PushTokenRequest,
  RemoveDeviceRequest,
  UntrustDeviceRequest,
} from '../types/device.type.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Device public key in base64url. */
export const DevicePublicKeyFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.devicePublicKeyMaxLength)
  .regex(BASE64URL);

/**
 * Signature fields that each request without a session from the device copies
 * into its body. The nonce bounds its length to prevent reusable signatures.
 */
const DeviceSignatureShape = {
  deviceId: z.string().min(1).max(IdentityLimits.deviceIdMaxLength),
  timestamp: TimestampSchema,
  nonce: z
    .string()
    .min(IdentityLimits.deviceNonceMinLength)
    .max(IdentityLimits.deviceNonceMaxLength)
    .regex(BASE64URL),
  signature: z
    .string()
    .min(1)
    .max(IdentityLimits.deviceSignatureMaxLength)
    .regex(BASE64URL),
};

export const DeviceSignatureSchema = z
  .strictObject({ ...DeviceSignatureShape })
  .describe(
    'Proof that a request comes from a registered device, signed with its key.',
  ) satisfies z.ZodType<DeviceSignatureFields>;

const ApprovalCodeFieldSchema = z
  .string()
  .min(IdentityLimits.approvalCodeMinLength)
  .max(IdentityLimits.approvalCodeMaxLength);

const ApprovalContextFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.approvalContextMaxLength);

export const RemoveDeviceRequestSchema = z
  .strictObject({ deviceId: IdSchema })
  .describe(
    'Device to remove from the account.',
  ) satisfies z.ZodType<RemoveDeviceRequest>;

export const UntrustDeviceRequestSchema = z
  .strictObject({ deviceId: IdSchema })
  .describe(
    'Device whose trust is removed.',
  ) satisfies z.ZodType<UntrustDeviceRequest>;

export const PushTokenRequestSchema = z
  .strictObject({
    pushToken: z.string().min(1).max(IdentityLimits.devicePushTokenMaxLength),
  })
  .describe(
    'Push notification token of the current device.',
  ) satisfies z.ZodType<PushTokenRequest>;

export const PullDeviceApprovalsRequestSchema = z
  .strictObject({ ...DeviceSignatureShape })
  .describe(
    'Request for pending approvals signed by the device.',
  ) satisfies z.ZodType<PullDeviceApprovalsRequest>;

export const DenyDeviceApprovalRequestSchema = z
  .strictObject({ challengeId: IdSchema, ...DeviceSignatureShape })
  .describe(
    'Denial of a pending approval signed by the device.',
  ) satisfies z.ZodType<DenyDeviceApprovalRequest>;

export const ApprovalContextSchema = z
  .object({
    browser: ApprovalContextFieldSchema.optional(),
    os: ApprovalContextFieldSchema.optional(),
    ip: ApprovalContextFieldSchema.optional(),
    city: ApprovalContextFieldSchema.optional(),
  })
  .describe(
    'Context of the approval request that the user reviews.',
  ) satisfies z.ZodType<ApprovalContext>;

export const DeviceApprovalSchema = z
  .object({
    challengeId: IdSchema,
    code: ApprovalCodeFieldSchema,
    requestedAt: TimestampSchema,
    expiresAt: TimestampSchema,
    context: ApprovalContextSchema,
  })
  .describe(
    'Pending approval of a device.',
  ) satisfies z.ZodType<DeviceApproval>;

export const DeviceApprovalsSchema = z
  .object({
    approvals: z
      .array(DeviceApprovalSchema)
      .max(IdentityLimits.maxDeviceApprovals),
  })
  .describe(
    'Pending approvals of a device.',
  ) satisfies z.ZodType<DeviceApprovals>;
