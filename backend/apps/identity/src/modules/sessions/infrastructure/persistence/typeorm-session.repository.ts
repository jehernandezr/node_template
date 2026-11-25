import { Injectable } from '@nestjs/common';
import { RepositoryKit } from '@platform/persistence';
import { IsNull } from 'typeorm';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import type { Session } from '../../domain/session.js';
import { SessionRepository } from '../../domain/session.repository.js';
import { SessionEntity } from './entities/session.entity.js';
import { SessionMapper } from './session.mapper.js';

/** `SessionRepository` over `sessions` of the user shard. */
@Injectable()
export class TypeOrmSessionRepository
  extends UserShardRepository
  implements SessionRepository
{
  private readonly mapper = new SessionMapper();

  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async insert(session: Session): Promise<void> {
    const row = this.mapper.toPersistence(session);
    await this.write((manager) => manager.insert(SessionEntity, row));
  }

  async find(userId: string, sessionId: string): Promise<Session | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(SessionEntity, { id: sessionId, userId }),
    );
    return row === null ? undefined : this.mapper.toDomain(row);
  }

  async findForUpdate(
    userId: string,
    sessionId: string,
  ): Promise<Session | undefined> {
    const row = await this.write((manager) =>
      manager.findOne(SessionEntity, {
        where: { id: sessionId, userId },
        lock: { mode: 'pessimistic_write' },
      }),
    );
    return row === null ? undefined : this.mapper.toDomain(row);
  }

  async listActive(userId: string): Promise<readonly Session[]> {
    const rows = await this.read((manager) =>
      manager.find(SessionEntity, {
        where: { userId, revokedAt: IsNull() },
        order: { lastRefreshAt: 'DESC' },
      }),
    );
    return rows.map((row) => this.mapper.toDomain(row));
  }

  /** {@inheritDoc SessionRepository.forget} */
  async forget(userId: string): Promise<void> {
    await this.write((manager) => manager.delete(SessionEntity, { userId }));
  }

  async update(session: Session): Promise<void> {
    await this.updateVersioned(
      SessionEntity,
      this.mapper.toPersistence(session),
      { userId: session.snapshot().userId },
    );
  }
}
