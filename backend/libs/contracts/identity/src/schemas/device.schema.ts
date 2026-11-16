import { z } from 'zod';
import { IdSchema, TimestampSchema } from '@contracts/platform';
import { IdentityLimits } from '../constants/identity.constants.js';
import type {
  ApprovalContext,
  DeviceApproval,
  DeviceApprovals,
  DenyDeviceApprovalRequest,
  PullDeviceApprovalsRequest,
  PushTokenRequest,
  RemoveDeviceRequest,
  UntrustDeviceRequest,
} from '../types/device.type.js';

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** Clave pública del dispositivo en base64url. */
export const DevicePublicKeyFieldSchema = z
  .string()
  .min(1)
  .max(IdentityLimits.devicePublicKeyMaxLength)
  .regex(BASE64URL);

/**
 * Campos de firma que cada petición sin sesión del dispositivo copia en su
 * cuerpo. El nonce acota el largo para impedir firmas reutilizables.
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
    'Dispositivo a quitar de la cuenta.',
  ) satisfies z.ZodType<RemoveDeviceRequest>;

export const UntrustDeviceRequestSchema = z
  .strictObject({ deviceId: IdSchema })
  .describe(
    'Dispositivo al que se le quita la confianza.',
  ) satisfies z.ZodType<UntrustDeviceRequest>;

export const PushTokenRequestSchema = z
  .strictObject({
    pushToken: z.string().min(1).max(IdentityLimits.devicePushTokenMaxLength),
  })
  .describe(
    'Token de notificaciones push del dispositivo actual.',
  ) satisfies z.ZodType<PushTokenRequest>;

export const PullDeviceApprovalsRequestSchema = z
  .strictObject({ ...DeviceSignatureShape })
  .describe(
    'Pedido de aprobaciones pendientes firmado por el dispositivo.',
  ) satisfies z.ZodType<PullDeviceApprovalsRequest>;

export const DenyDeviceApprovalRequestSchema = z
  .strictObject({ challengeId: IdSchema, ...DeviceSignatureShape })
  .describe(
    'Rechazo de una aprobación pendiente firmado por el dispositivo.',
  ) satisfies z.ZodType<DenyDeviceApprovalRequest>;

export const ApprovalContextSchema = z
  .object({
    browser: ApprovalContextFieldSchema.optional(),
    os: ApprovalContextFieldSchema.optional(),
    ip: ApprovalContextFieldSchema.optional(),
    city: ApprovalContextFieldSchema.optional(),
  })
  .describe(
    'Contexto de la solicitud de aprobación que el usuario revisa.',
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
    'Aprobación pendiente de un dispositivo.',
  ) satisfies z.ZodType<DeviceApproval>;

export const DeviceApprovalsSchema = z
  .object({
    approvals: z
      .array(DeviceApprovalSchema)
      .max(IdentityLimits.maxDeviceApprovals),
  })
  .describe(
    'Aprobaciones pendientes de un dispositivo.',
  ) satisfies z.ZodType<DeviceApprovals>;
