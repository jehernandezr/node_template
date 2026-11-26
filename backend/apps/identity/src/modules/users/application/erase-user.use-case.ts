import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  UserErasedEvent,
  type EraseUserResult,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { LoginAttemptHistory } from '../../authentication/index.js';
import { DevicesFacade } from '../../devices/index.js';
import { MfaFacade } from '../../mfa/index.js';
import { PasskeysFacade } from '../../passkeys/index.js';
import { PasswordsFacade } from '../../passwords/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserRepository } from '../domain/user.repository.js';
import { UserReader } from './user-reader.js';

/**
 * Last step of `DeleteAccount`: it first removes the user from their tenants (each tenant publishes the
 * removal, and billing stops counting them), so a tenant that would be left without an owner stops the erasure
 * before anything else of identity is gone. Then it erases the personal data of the user, revokes and deletes
 * their sessions (with their IPs and user agents), deletes their sign-in history, their password, their second
 * factors, their passkeys and their devices, publishes `identity.user.erased.v1` and finally removes their row
 * from `identity_lookup`, which is what finds them. If they are no longer in the directory, the erasure finished
 * earlier: repeating it answers the same without touching anything.
 */
@Injectable()
export class EraseUser {
  constructor(
    private readonly reader: UserReader,
    private readonly users: UserRepository,
    private readonly directory: UserDirectory,
    private readonly sessions: SessionsFacade,
    private readonly attempts: LoginAttemptHistory,
    private readonly mfa: MfaFacade,
    private readonly passwords: PasswordsFacade,
    private readonly passkeys: PasskeysFacade,
    private readonly devices: DevicesFacade,
    private readonly access: AccessFacade,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  /**
   * Erases a user.
   * @param userId User.
   * @returns The user and the instant of the erasure.
   * @throws IdentityError `IDENTITY.USER.NOT_FOUND` if the directory points to a user that does not exist.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if the user is still the last owner of a tenant with other
   *   members.
   */
  async execute(userId: string): Promise<EraseUserResult> {
    const now = this.clock.now();
    const ref = await this.reader.refOf(userId);
    if (ref !== undefined) {
      await this.access.removeFromAllTenants(ref);
      await this.erase(ref, now);
      await this.sessions.forget(ref);
      await this.attempts.forget(ref);
      await this.mfa.forget(ref);
      await this.passwords.forget(ref);
      await this.passkeys.forget(ref);
      await this.devices.forget(ref);
      await this.directory.forget(userId);
    }
    return { userId, erasedAt: now.toISOString() };
  }

  private erase(ref: UserRef, now: Date): Promise<void> {
    return this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const user = await this.users.find(ref.userId);
        if (user === undefined) {
          throw new IdentityError(IdentityErrorCode.UserNotFound);
        }
        if (!user.erase()) {
          return;
        }
        await this.users.update(user);
        await this.bus.publish(
          UserErasedEvent,
          {
            userId: ref.userId,
            homeTenantId: ref.homeTenantId,
            erasedAt: now.toISOString(),
          },
          { tenantId: ref.homeTenantId },
        );
      }),
    );
  }
}
