import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  type UpdateProfileRequest,
  type UserProfile,
} from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { UserRepository } from '../domain/user.repository.js';
import { UserProfileView } from './user-profile-view.js';
import { UserReader } from './user-reader.js';

/** Changes the user's display name or language. */
@Injectable()
export class UpdateMyProfile {
  constructor(
    private readonly users: UserRepository,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  /**
   * Changes the display name or locale of the user.
   * @param ref Signed-in user.
   * @param changes New values.
   * @returns The profile after the change.
   */
  async execute(
    ref: UserRef,
    changes: UpdateProfileRequest,
  ): Promise<UserProfile> {
    const user = await this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const found = await this.users.find(ref.userId);
        if (found === undefined) {
          throw new IdentityError(IdentityErrorCode.UserNotFound);
        }
        found.updateProfile(changes);
        await this.users.update(found);
        return found;
      }),
    );
    return UserProfileView.of(UserReader.snapshotOf(user.snapshot()));
  }
}
