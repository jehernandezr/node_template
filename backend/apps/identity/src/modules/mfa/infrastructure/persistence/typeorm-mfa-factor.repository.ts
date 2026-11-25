import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit } from '@platform/persistence';
import { IsNull, MoreThanOrEqual } from 'typeorm';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import { MfaFactorRepository } from '../../domain/mfa-factor-repository.js';
import {
  MfaRecoveryStatus,
  type MfaRecovery,
} from '../../domain/mfa-recovery.js';
import type { TotpFactor } from '../../domain/totp-factor.js';
import { MfaRecoveryEntity } from './entities/mfa-recovery.entity.js';
import { RecoveryCodeEntity } from './entities/recovery-code.entity.js';
import { TotpFactorEntity } from './entities/totp-factor.entity.js';

/** `MfaFactorRepository` over the factor tables of the user shard. */
@Injectable()
export class TypeOrmMfaFactorRepository
  extends UserShardRepository
  implements MfaFactorRepository
{
  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async findTotp(userId: string): Promise<TotpFactor | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(TotpFactorEntity, { id: userId }),
    );
    return row === null
      ? undefined
      : {
          userId: row.id,
          encryptedSecret: row.encryptedSecret,
          ...(row.confirmedAt === null ? {} : { confirmedAt: row.confirmedAt }),
          lastUsedStep: Number(row.lastUsedStep),
          ...(row.version === undefined ? {} : { version: row.version }),
        };
  }

  async saveTotp(factor: TotpFactor): Promise<void> {
    const row = new TotpFactorEntity();
    row.id = factor.userId;
    row.encryptedSecret = factor.encryptedSecret;
    row.confirmedAt = factor.confirmedAt ?? null;
    row.lastUsedStep = String(factor.lastUsedStep);
    if (factor.version === undefined) {
      await this.write((manager) => manager.insert(TotpFactorEntity, row));
      return;
    }
    row.version = factor.version;
    await this.updateVersioned(TotpFactorEntity, row);
  }

  async deleteTotp(userId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(TotpFactorEntity, { id: userId }),
    );
  }

  async replaceRecoveryCodes(
    userId: string,
    hashes: readonly string[],
  ): Promise<void> {
    await this.write(async (manager) => {
      await manager.delete(RecoveryCodeEntity, { userId });
      await manager.insert(
        RecoveryCodeEntity,
        hashes.map((codeHash) => ({
          id: this.ids.next().toString(),
          userId,
          codeHash,
          usedAt: null,
        })),
      );
    });
  }

  countRecoveryCodes(userId: string): Promise<number> {
    return this.read((manager) =>
      manager.countBy(RecoveryCodeEntity, { userId, usedAt: IsNull() }),
    );
  }

  async useRecoveryCode(
    userId: string,
    hash: string,
    at: Date,
  ): Promise<boolean> {
    const result = await this.write((manager) =>
      manager.update(
        RecoveryCodeEntity,
        { userId, codeHash: hash, usedAt: IsNull() },
        { usedAt: at },
      ),
    );
    return (result.affected ?? 0) > 0;
  }

  async insertRecovery(recovery: MfaRecovery): Promise<void> {
    await this.write((manager) =>
      manager.insert(MfaRecoveryEntity, this.recoveryRow(recovery)),
    );
  }

  async findRecoveryByToken(
    userId: string,
    tokenHash: string,
  ): Promise<MfaRecovery | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(MfaRecoveryEntity, { userId, tokenHash }),
    );
    return row === null
      ? undefined
      : {
          id: row.id,
          userId: row.userId,
          tokenHash: row.tokenHash,
          requestedAt: row.requestedAt,
          availableAt: row.availableAt,
          status: row.status as MfaRecoveryStatus,
          ...(row.version === undefined ? {} : { version: row.version }),
        };
  }

  countRecoveriesSince(userId: string, since: Date): Promise<number> {
    return this.read((manager) =>
      manager.countBy(MfaRecoveryEntity, {
        userId,
        requestedAt: MoreThanOrEqual(since),
      }),
    );
  }

  async updateRecovery(recovery: MfaRecovery): Promise<void> {
    await this.updateVersioned(MfaRecoveryEntity, this.recoveryRow(recovery));
  }

  /** {@inheritDoc MfaFactorRepository.cancelPendingRecoveries} */
  async cancelPendingRecoveries(userId: string): Promise<number> {
    const result = await this.write((manager) =>
      manager.update(
        MfaRecoveryEntity,
        { userId, status: MfaRecoveryStatus.Pending },
        { status: MfaRecoveryStatus.Cancelled },
      ),
    );
    return result.affected ?? 0;
  }

  private recoveryRow(recovery: MfaRecovery): MfaRecoveryEntity {
    const row = new MfaRecoveryEntity();
    row.id = recovery.id;
    row.userId = recovery.userId;
    row.tokenHash = recovery.tokenHash;
    row.requestedAt = recovery.requestedAt;
    row.availableAt = recovery.availableAt;
    row.status = recovery.status;
    if (recovery.version !== undefined) {
      row.version = recovery.version;
    }
    return row;
  }
}
