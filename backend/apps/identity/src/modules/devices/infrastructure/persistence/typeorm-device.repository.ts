import { Injectable } from '@nestjs/common';
import type { ClientPlatform } from '@contracts/identity';
import { RepositoryKit } from '@platform/persistence';
import { IsNull } from 'typeorm';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import { Device } from '../../domain/device.js';
import { DeviceRepository } from '../../domain/device.repository.js';
import { DeviceEntity } from './entities/device.entity.js';

/** `DeviceRepository` sobre `devices` del shard del usuario. */
@Injectable()
export class TypeOrmDeviceRepository
  extends UserShardRepository
  implements DeviceRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async insert(device: Device): Promise<void> {
    const row = this.toRow(device);
    await this.write((manager) => manager.insert(DeviceEntity, row));
  }

  async find(userId: string, deviceId: string): Promise<Device | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(DeviceEntity, { id: deviceId, userId }),
    );
    return row === null ? undefined : this.toDomain(row);
  }

  async listActive(userId: string): Promise<readonly Device[]> {
    const rows = await this.read((manager) =>
      manager.find(DeviceEntity, {
        where: { userId, removedAt: IsNull() },
        order: { lastSeenAt: 'DESC' },
      }),
    );
    return rows.map((row) => this.toDomain(row));
  }

  async update(device: Device): Promise<void> {
    await this.updateVersioned(DeviceEntity, this.toRow(device), {
      userId: device.snapshot().userId,
    });
  }

  private toDomain(row: DeviceEntity): Device {
    return Device.rehydrate({
      id: row.id,
      userId: row.userId,
      name: row.name,
      platform: row.platform as ClientPlatform,
      publicKey: row.publicKey,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      lastIp: row.lastIp,
      ...(row.trustedUntil === null ? {} : { trustedUntil: row.trustedUntil }),
      verifier: row.verifier,
      ...(row.pushToken === null ? {} : { pushToken: row.pushToken }),
      ...(row.removedAt === null ? {} : { removedAt: row.removedAt }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  private toRow(device: Device): DeviceEntity {
    const state = device.snapshot();
    const row = new DeviceEntity();
    row.id = state.id;
    row.userId = state.userId;
    row.name = state.name;
    row.platform = state.platform;
    row.publicKey = state.publicKey;
    row.firstSeenAt = state.firstSeenAt;
    row.lastSeenAt = state.lastSeenAt;
    row.lastIp = state.lastIp;
    row.trustedUntil = state.trustedUntil ?? null;
    row.verifier = state.verifier;
    row.pushToken = state.pushToken ?? null;
    row.removedAt = state.removedAt ?? null;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
