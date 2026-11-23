import { Injectable } from '@nestjs/common';
import { RepositoryKit } from '@platform/persistence';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import type { PasswordCredential } from '../../domain/password-credential.js';
import { PasswordCredentialRepository } from '../../domain/password-credential.repository.js';
import { PasswordCredentialEntity } from './entities/password-credential.entity.js';

/** `PasswordCredentialRepository` sobre `password_credentials`. */
@Injectable()
export class TypeOrmPasswordCredentialRepository
  extends UserShardRepository
  implements PasswordCredentialRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async find(userId: string): Promise<PasswordCredential | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(PasswordCredentialEntity, { id: userId }),
    );
    return row === null
      ? undefined
      : {
          userId: row.id,
          hash: row.hash,
          changedAt: row.changedAt,
          ...(row.version === undefined ? {} : { version: row.version }),
        };
  }

  async delete(userId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(PasswordCredentialEntity, { id: userId }),
    );
  }

  async save(credential: PasswordCredential): Promise<void> {
    const row = new PasswordCredentialEntity();
    row.id = credential.userId;
    row.hash = credential.hash;
    row.changedAt = credential.changedAt;
    if (credential.version === undefined) {
      await this.write((manager) =>
        manager.insert(PasswordCredentialEntity, row),
      );
      return;
    }
    row.version = credential.version;
    await this.updateVersioned(PasswordCredentialEntity, row);
  }
}
