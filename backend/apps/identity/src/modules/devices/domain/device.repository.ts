import type { Device } from './device.js';

/** Devices in the user shard. */
export abstract class DeviceRepository {
  /**
   * Stores a new device.
   * @param device Device to store.
   */
  abstract insert(device: Device): Promise<void>;
  /**
   * Reads a device of a user.
   * @param userId Owner.
   * @param deviceId Device to read.
   * @returns The device, or `undefined`.
   */
  abstract find(userId: string, deviceId: string): Promise<Device | undefined>;
  /**
   * The user's non-removed devices, most recent first.
   * @param userId Owner.
   * @returns The devices.
   */
  abstract listActive(userId: string): Promise<readonly Device[]>;
  /**
   * Saves the changes of a device.
   * @param device Device read earlier and changed.
   */
  abstract update(device: Device): Promise<void>;
}
