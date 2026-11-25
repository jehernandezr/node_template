import type { DeviceApproval } from '@contracts/identity';

/** Pending approvals of each verifier device and nonces already used in its signatures. */
export abstract class DeviceApprovalStore {
  abstract enqueue(
    deviceId: string,
    approval: DeviceApproval,
    ttlMs: number,
  ): Promise<void>;
  /** The current ones, without consuming them: the device can request them again. */
  abstract pending(
    deviceId: string,
    now: Date,
  ): Promise<readonly DeviceApproval[]>;
  /** Removes that device's approval and returns it; `undefined` if it was not its own or was already gone. */
  abstract remove(
    deviceId: string,
    challengeId: string,
  ): Promise<DeviceApproval | undefined>;
  /** Returns `false` if the nonce was already used: a signature is not repeated. */
  abstract useNonce(deviceId: string, nonce: string): Promise<boolean>;
}
