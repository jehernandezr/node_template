import type { UserStatus } from '@contracts/identity';
import { User } from '../../domain/user.js';
import { UserEntity } from './entities/user.entity.js';

/** Converts between `User` and its row. */
export class UserMapper {
  /**
   * Rebuilds a user from its row.
   * @param row Stored row.
   * @returns The domain user.
   */
  toDomain(row: UserEntity): User {
    return User.rehydrate({
      id: row.id,
      homeTenantId: row.homeTenantId,
      email: row.email,
      emailFingerprint: row.emailFingerprint,
      ...(row.emailVerifiedAt === null
        ? {}
        : { emailVerifiedAt: row.emailVerifiedAt }),
      status: row.status as UserStatus,
      displayName: row.displayName,
      locale: row.locale,
      ...(row.lastTenantId === null ? {} : { lastTenantId: row.lastTenantId }),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  /**
   * Turns a user into its row.
   * @param user Domain user.
   * @returns The row to store.
   */
  toPersistence(user: User): UserEntity {
    const state = user.snapshot();
    const row = new UserEntity();
    row.id = state.id;
    row.homeTenantId = state.homeTenantId;
    row.email = state.email;
    row.emailFingerprint = state.emailFingerprint;
    row.emailVerifiedAt = state.emailVerifiedAt ?? null;
    row.status = state.status;
    row.displayName = state.displayName;
    row.locale = state.locale;
    row.lastTenantId = state.lastTenantId ?? null;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
