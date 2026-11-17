import type { Device } from './device.js';

/** Dispositivos en el shard del usuario. */
export abstract class DeviceRepository {
  abstract insert(device: Device): Promise<void>;
  abstract find(userId: string, deviceId: string): Promise<Device | undefined>;
  /** Dispositivos sin quitar del usuario, el más reciente primero. */
  abstract listActive(userId: string): Promise<readonly Device[]>;
  abstract update(device: Device): Promise<void>;
}
