import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { UserRegisteredEvent } from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { PasswordsFacade } from '../../passwords/index.js';
import { EmailFingerprinter } from '../domain/email-fingerprinter.js';
import { LookupStatus } from '../domain/lookup-status.enum.js';
import type { RegisterUserInput } from '../domain/register-user-input.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.js';

/**
 * Creates a user across the catalog and their shard, which do not share a transaction: reserves the email in the
 * catalog, creates the user, their password and the event in the shard, and activates the reservation. If the shard fails,
 * it releases the reservation; an orphan reservation is swept by `IdentityJob.SweepReservedLookups`.
 */
@Injectable()
export class UserRegistrar {
  constructor(
    private readonly users: UserRepository,
    private readonly directory: UserDirectory,
    private readonly fingerprints: EmailFingerprinter,
    private readonly passwords: PasswordsFacade,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /** Returns `undefined` if the email already belongs to another user. */
  async register(
    input: RegisterUserInput,
    verifiedAt?: Date,
  ): Promise<UserRef | undefined> {
    const email = normalizeEmail(input.email);
    const fingerprint = this.fingerprints.fingerprint(email);
    const now = this.clock.now();
    const ref = {
      userId: this.ids.next().toString(),
      homeTenantId: input.homeTenantId,
    };
    const reserved = await this.directory.reserve({
      emailFingerprint: fingerprint,
      userId: ref.userId,
      homeTenantId: ref.homeTenantId,
      region: this.settings.values.IDENTITY_REGION,
      status: LookupStatus.Reserved,
      createdAt: now,
    });
    if (!reserved) {
      return undefined;
    }
    const user = User.register({
      id: ref.userId,
      homeTenantId: ref.homeTenantId,
      email,
      emailFingerprint: fingerprint,
      displayName: input.displayName,
      locale: input.locale,
    });
    if (verifiedAt !== undefined) {
      user.verifyEmail(verifiedAt);
    }
    try {
      await this.scopes.inUserShard(ref, () =>
        this.transactions.runInTransaction(async () => {
          await this.users.insert(user);
          await this.passwords.setInitial(ref, input.password);
          await this.bus.publish(
            UserRegisteredEvent,
            {
              userId: ref.userId,
              homeTenantId: ref.homeTenantId,
              registeredAt: now.toISOString(),
            },
            { tenantId: ref.homeTenantId },
          );
        }),
      );
    } catch (error) {
      await this.directory.release(fingerprint, ref.userId);
      throw error;
    }
    await this.directory.activate(fingerprint);
    return ref;
  }
}
