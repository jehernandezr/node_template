import type { DeviceApproval } from '@contracts/identity';

/** Pending approvals of each verifier device and nonces already used in its signatures. */
export abstract class DeviceApprovalStore {
  /**
   * Queues a sign-in approval for a device.
   * @param deviceId Device that approves.
   * @param approval Challenge to approve.
   * @param ttlMs Lifetime of the approval.
   */
  abstract enqueue(
    deviceId: string,
    approval: DeviceApproval,
    ttlMs: number,
  ): Promise<void>;
  /**
   * The current ones, without consuming them: the device can request them again.
   * @param deviceId Device to read.
   * @param now Current instant.
   * @returns The pending approvals.
   */
  abstract pending(
    deviceId: string,
    now: Date,
  ): Promise<readonly DeviceApproval[]>;
  /**
   * Removes that device's approval and returns it; `undefined` if it was not its own or was already gone.
   * @param deviceId Device that owns it.
   * @param challengeId Challenge to remove.
   * @returns The removed approval, or `undefined`.
   */
  abstract remove(
    deviceId: string,
    challengeId: string,
  ): Promise<DeviceApproval | undefined>;
  /**
   * Returns `false` if the nonce was already used: a signature is not repeated.
   * @param deviceId Device that signed.
   * @param nonce Nonce of the signature.
   * @returns Whether it was new.
   */
  abstract useNonce(deviceId: string, nonce: string): Promise<boolean>;
}
