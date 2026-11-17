import { Injectable } from '@nestjs/common';
import { RepositoryKit } from '@platform/persistence';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import type { User } from '../../domain/user.js';
import { UserRepository } from '../../domain/user.repository.js';
import { UserEntity } from './entities/user.entity.js';
import { UserMapper } from './user.mapper.js';

/** `UserRepository` sobre `users` del shard del usuario. */
@Injectable()
export class TypeOrmUserRepository
  extends UserShardRepository
  implements UserRepository
{
  private readonly mapper = new UserMapper();

  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async insert(user: User): Promise<void> {
    const row = this.mapper.toPersistence(user);
    await this.write((manager) => manager.insert(UserEntity, row));
  }

  async find(userId: string): Promise<User | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(UserEntity, { id: userId }),
    );
    return row === null ? undefined : this.mapper.toDomain(row);
  }

  async update(user: User): Promise<void> {
    await this.updateVersioned(UserEntity, this.mapper.toPersistence(user));
  }
}
