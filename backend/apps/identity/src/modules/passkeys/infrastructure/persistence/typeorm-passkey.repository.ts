import { Injectable } from '@nestjs/common';
import { RepositoryKit } from '@platform/persistence';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import type { Passkey } from '../../domain/passkey.js';
import { PasskeyRepository } from '../../domain/passkey-store.js';
import { PasskeyEntity } from './entities/passkey.entity.js';

/** `PasskeyRepository` over `passkeys` in the user's shard. */
@Injectable()
export class TypeOrmPasskeyRepository
  extends UserShardRepository
  implements PasskeyRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async list(userId: string): Promise<readonly Passkey[]> {
    const rows = await this.read((manager) =>
      manager.find(PasskeyEntity, {
        where: { userId },
        order: { createdAt: 'ASC' },
      }),
    );
    return rows.map((row) => this.toDomain(row));
  }

  async findByCredential(
    userId: string,
    credentialId: string,
  ): Promise<Passkey | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(PasskeyEntity, { userId, credentialId }),
    );
    return row === null ? undefined : this.toDomain(row);
  }

  async insert(passkey: Passkey): Promise<void> {
    const row = this.toRow(passkey);
    await this.write((manager) => manager.insert(PasskeyEntity, row));
  }

  async update(passkey: Passkey): Promise<void> {
    await this.updateVersioned(PasskeyEntity, this.toRow(passkey), {
      userId: passkey.userId,
    });
  }

  async delete(
    userId: string,
    passkeyId: string,
  ): Promise<Passkey | undefined> {
    return this.write(async (manager) => {
      const row = await manager.findOneBy(PasskeyEntity, {
        id: passkeyId,
        userId,
      });
      if (row === null) {
        return undefined;
      }
      await manager.delete(PasskeyEntity, { id: passkeyId, userId });
      return this.toDomain(row);
    });
  }

  private toDomain(row: PasskeyEntity): Passkey {
    return {
      id: row.id,
      userId: row.userId,
      credentialId: row.credentialId,
      publicKey: row.publicKey,
      signCount: Number(row.signCount),
      transports: row.transports,
      aaguid: row.aaguid,
      backedUp: row.backedUp,
      name: row.name,
      ...(row.lastUsedAt === null ? {} : { lastUsedAt: row.lastUsedAt }),
      createdAt: row.createdAt ?? new Date(0),
      ...(row.version === undefined ? {} : { version: row.version }),
    };
  }

  private toRow(passkey: Passkey): PasskeyEntity {
    const row = new PasskeyEntity();
    row.id = passkey.id;
    row.userId = passkey.userId;
    row.credentialId = passkey.credentialId;
    row.publicKey = passkey.publicKey;
    row.signCount = String(passkey.signCount);
    row.transports = [...passkey.transports];
    row.aaguid = passkey.aaguid;
    row.backedUp = passkey.backedUp;
    row.name = passkey.name;
    row.lastUsedAt = passkey.lastUsedAt ?? null;
    if (passkey.version !== undefined) {
      row.version = passkey.version;
    }
    return row;
  }
}
