import type { DeviceApproval } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { DeviceProof } from '../domain/device-proof.js';
import type { DeviceRecognition } from '../domain/device-recognition.js';
import type { DeviceSnapshot } from '../domain/device-snapshot.js';
import type { RegisterDeviceInput } from '../domain/register-device-input.js';

/** Recognizes, registers and retires the devices of a user and queues their approval for the sign-in flows. */
export abstract class DevicesFacade {
  /**
   * Recognizes the device of a sign-in from its signature, never from its public id alone.
   * @param ref User who is signing in.
   * @param proof Device signature that the request carries, if any.
   * @returns Whether a trusted device of that user signed the request.
   */
  abstract recognize(
    ref: UserRef,
    proof?: DeviceProof,
  ): Promise<DeviceRecognition>;

  /**
   * Formats the public id (`dv1_...`) of a device of the user, with the route to its shard.
   * @param ref Owner of the device.
   * @param deviceId Internal device id.
   * @returns The public device id.
   */
  abstract issueDeviceId(ref: UserRef, deviceId: string): Promise<string>;

  /**
   * Registers a new device; the first one of the account becomes the verifier.
   * @param ref Owner of the device.
   * @param input Public key, platform, name and IP of the device.
   * @returns The stored device.
   * @throws DomainError `IDENTITY.DEVICE.KEY_INVALID` if the key is not P-256.
   */
  abstract register(
    ref: UserRef,
    input: RegisterDeviceInput,
  ): Promise<DeviceSnapshot>;

  /**
   * Lists the trusted verifier devices of a user.
   * @param ref User whose verifiers are listed.
   * @returns The trusted verifiers.
   */
  abstract verifiers(ref: UserRef): Promise<readonly DeviceSnapshot[]>;

  /**
   * Removes the verifier role from every device: a recovery without a device treats them as lost.
   * @param ref User whose verifiers are retired.
   */
  abstract retireVerifiers(ref: UserRef): Promise<void>;

  /**
   * Removes every device of the user, whose account is being erased.
   * @param ref User whose devices are removed.
   */
  abstract forget(ref: UserRef): Promise<void>;

  /**
   * Queues an approval for a verifier device.
   * @param deviceId Device that must approve.
   * @param approval Approval to show on the device.
   */
  abstract enqueueApproval(
    deviceId: string,
    approval: DeviceApproval,
  ): Promise<void>;
}
