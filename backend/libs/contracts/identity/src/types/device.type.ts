import type { ClientPlatform } from '../enums/auth.enum.js';

/**
 * Signature that the registered device copies into each request without a
 * session. The server checks it with the stored public key, so it does not
 * replace the access token: it proves that the request comes from the device.
 */
export interface DeviceSignatureFields {
  deviceId: string;
  /** ISO 8601 instant at which the device signed the request. */
  timestamp: string;
  /** Random value that prevents reusing a signature. */
  nonce: string;
  /** base64url signature of the signed content. */
  signature: string;
}

/** Remove a device from the account. */
export interface RemoveDeviceRequest {
  deviceId: string;
}

/** Remove the trust of a device without deleting its record. */
export interface UntrustDeviceRequest {
  deviceId: string;
}

/** Push notification token of the current device. */
export interface PushTokenRequest {
  pushToken: string;
}

/** Request for the pending approvals of the signing device. */
export type PullDeviceApprovalsRequest = DeviceSignatureFields;

/** Denial of a pending approval, signed by the device. */
export interface DenyDeviceApprovalRequest extends DeviceSignatureFields {
  challengeId: string;
}

/** Context of the request that the user sees before approving it. */
export interface ApprovalContext {
  browser?: string;
  os?: string;
  ip?: string;
  city?: string;
}

/** Pending approval: a code that the user confirms on their device. */
export interface DeviceApproval {
  challengeId: string;
  code: string;
  /** ISO 8601 instant at which the approval was requested. */
  requestedAt: string;
  /** ISO 8601 instant at which it stops being valid. */
  expiresAt: string;
  context: ApprovalContext;
}

/** Pending approvals of a device. */
export interface DeviceApprovals {
  approvals: DeviceApproval[];
}

/** Payload of `identity.device.registered.v1`. */
export interface DeviceRegisteredPayload {
  userId: string;
  deviceId: string;
  platform: ClientPlatform;
  /** True if the device becomes the verifier of sensitive actions. */
  verifier: boolean;
  registeredAt: string;
}

/** Payload of `identity.device.removed.v1`. */
export interface DeviceRemovedPayload {
  userId: string;
  deviceId: string;
  removedAt: string;
}
