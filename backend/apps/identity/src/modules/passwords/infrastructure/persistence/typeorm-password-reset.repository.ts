import { Injectable } from '@nestjs/common';
import { RepositoryKit } from '@platform/persistence';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import { PasswordReset } from '../../domain/password-reset.js';
import { PasswordResetRepository } from '../../domain/password-reset.repository.js';
import { PasswordResetEntity } from './entities/password-reset.entity.js';

/** `PasswordResetRepository` sobre `password_resets` del shard del usuario. */
@Injectable()
export class TypeOrmPasswordResetRepository
  extends UserShardRepository
  implements PasswordResetRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async insert(reset: PasswordReset): Promise<void> {
    await this.write((manager) =>
      manager.insert(PasswordResetEntity, this.toRow(reset)),
    );
  }

  async findForUpdate(
    userId: string,
    resetId: string,
  ): Promise<PasswordReset | undefined> {
    const row = await this.write((manager) =>
      manager.findOne(PasswordResetEntity, {
        where: { id: resetId, userId },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    return row === null
      ? undefined
      : PasswordReset.rehydrate({
          id: row.id,
          userId: row.userId,
          tokenHash: row.tokenHash,
          expiresAt: row.expiresAt,
          ...(row.usedAt === null ? {} : { usedAt: row.usedAt }),
          version: row.version,
        });
  }

  async update(reset: PasswordReset): Promise<void> {
    await this.updateVersioned(PasswordResetEntity, this.toRow(reset), {
      userId: reset.snapshot().userId,
    });
  }

  private toRow(reset: PasswordReset): PasswordResetEntity {
    const state = reset.snapshot();
    const row = new PasswordResetEntity();
    row.id = state.id;
    row.userId = state.userId;
    row.tokenHash = state.tokenHash;
    row.expiresAt = state.expiresAt;
    row.usedAt = state.usedAt ?? null;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
