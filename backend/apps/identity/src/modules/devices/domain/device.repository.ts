import type { Device } from './device.js';

/** Devices in the user shard. */
export abstract class DeviceRepository {
  abstract insert(device: Device): Promise<void>;
  abstract find(userId: string, deviceId: string): Promise<Device | undefined>;
  /** The user's non-removed devices, most recent first. */
  abstract listActive(userId: string): Promise<readonly Device[]>;
  abstract update(device: Device): Promise<void>;
}
