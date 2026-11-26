import { Injectable } from '@nestjs/common';
import type { NotificationType } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import { ManagerIntent, RepositoryKit } from '@platform/persistence';
import { IsNull, type EntityManager } from 'typeorm';
import { InboxRepository } from '../../domain/inbox.repository.js';
import type { NotificationState } from '../../domain/notification.js';
import { NotificationEntity } from './entities/notification.entity.js';

/** `InboxRepository` over `notifications` in the user's shard. */
@Injectable()
export class TypeOrmInboxRepository extends InboxRepository {
  constructor(private readonly kit: RepositoryKit) {
    super();
  }

  override async add(
    owner: UserRef,
    notification: NotificationState,
  ): Promise<NotificationState> {
    return this.write(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(NotificationEntity)
        .values({
          id: notification.id,
          userId: notification.userId,
          homeTenantId: owner.homeTenantId,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          locale: notification.locale,
          createdAt: notification.createdAt,
          readAt: null,
        })
        .orIgnore()
        .execute();
      const row = await manager.findOneByOrFail(NotificationEntity, {
        id: notification.id,
      });
      return TypeOrmInboxRepository.stateOf(row);
    });
  }

  override async page(
    userId: string,
    beforeId: string | undefined,
    limit: number,
  ): Promise<readonly NotificationState[]> {
    const rows = await this.read((manager) => {
      const query = manager
        .createQueryBuilder(NotificationEntity, 'n')
        .where('n.userId = :userId', { userId })
        .orderBy('n.id', 'DESC')
        .take(limit);
      if (beforeId !== undefined) {
        query.andWhere('n.id < :beforeId', { beforeId });
      }
      return query.getMany();
    });
    return rows.map((row) => TypeOrmInboxRepository.stateOf(row));
  }

  override unreadCount(userId: string): Promise<number> {
    return this.read((manager) =>
      manager.countBy(NotificationEntity, { userId, readAt: IsNull() }),
    );
  }

  override async markRead(
    userId: string,
    notificationId: string,
    at: Date,
  ): Promise<boolean> {
    return this.write(async (manager) => {
      const exists = await manager.existsBy(NotificationEntity, {
        id: notificationId,
        userId,
      });
      if (exists) {
        await manager.update(
          NotificationEntity,
          { id: notificationId, userId, readAt: IsNull() },
          { readAt: at },
        );
      }
      return exists;
    });
  }

  override async markAllRead(userId: string, at: Date): Promise<void> {
    await this.write((manager) =>
      manager.update(
        NotificationEntity,
        { userId, readAt: IsNull() },
        { readAt: at },
      ),
    );
  }

  override async erase(userId: string): Promise<number> {
    const result = await this.write((manager) =>
      manager.delete(NotificationEntity, { userId }),
    );
    return result.affected ?? 0;
  }

  /** There is lag between a write's commit and the replica; the inbox is read from the primary. */
  private read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.ReadPrimary },
      fn,
    );
  }

  private write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.kit.provider.run(
      { feature: this.kit.feature, intent: ManagerIntent.Write },
      fn,
    );
  }

  private static stateOf(row: NotificationEntity): NotificationState {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type as NotificationType,
      title: row.title,
      body: row.body,
      locale: row.locale,
      createdAt: row.createdAt ?? new Date(0),
      ...(row.readAt === null ? {} : { readAt: row.readAt }),
    };
  }
}
