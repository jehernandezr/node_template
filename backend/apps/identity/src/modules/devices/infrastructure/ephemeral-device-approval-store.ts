import { Injectable } from '@nestjs/common';
import type { DeviceApproval } from '@contracts/identity';
import { DeviceApprovalSchema } from '@contracts/identity';
import { z } from 'zod';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import { DeviceApprovalStore } from '../domain/device-approval-store.js';

const ApprovalsSchema = z.array(DeviceApprovalSchema);

/**
 * Approvals of each device as a JSON list in Valkey. A user has few sign-ins at a
 * time, so reading and rewriting the list is enough; nonces use `SET NX`.
 */
@Injectable()
export class EphemeralDeviceApprovalStore extends DeviceApprovalStore {
  constructor(private readonly store: EphemeralStore) {
    super();
  }

  override async enqueue(
    deviceId: string,
    approval: DeviceApproval,
    ttlMs: number,
  ): Promise<void> {
    const current = await this.read(deviceId);
    await this.store.set(
      this.keyOf(deviceId),
      JSON.stringify([...current, approval]),
      ttlMs,
    );
  }

  override async pending(
    deviceId: string,
    now: Date,
  ): Promise<readonly DeviceApproval[]> {
    return (await this.read(deviceId)).filter(
      (approval) => Date.parse(approval.expiresAt) > now.getTime(),
    );
  }

  override async remove(
    deviceId: string,
    challengeId: string,
  ): Promise<DeviceApproval | undefined> {
    const current = await this.read(deviceId);
    const removed = current.find(
      (approval) => approval.challengeId === challengeId,
    );
    if (removed === undefined) {
      return undefined;
    }
    const remaining = current.filter((approval) => approval !== removed);
    const ttl = (await this.store.remainingMs(this.keyOf(deviceId))) ?? 0;
    if (remaining.length === 0 || ttl <= 0) {
      await this.store.delete(this.keyOf(deviceId));
      return removed;
    }
    await this.store.set(this.keyOf(deviceId), JSON.stringify(remaining), ttl);
    return removed;
  }

  override useNonce(deviceId: string, nonce: string): Promise<boolean> {
    return this.store.setIfAbsent(
      [IdentityCacheKey.DeviceNonce, deviceId, nonce].join(':'),
      '1',
      IdentityDefaults.deviceNonceTtlMs,
    );
  }

  private async read(deviceId: string): Promise<DeviceApproval[]> {
    const raw = await this.store.get(this.keyOf(deviceId));
    if (raw === undefined) {
      return [];
    }
    const parsed = ApprovalsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  }

  private keyOf(deviceId: string): string {
    return [IdentityCacheKey.DeviceApproval, deviceId].join(':');
  }
}
