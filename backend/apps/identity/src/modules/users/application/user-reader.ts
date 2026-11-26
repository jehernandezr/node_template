import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { IdentityErrorCode } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { EmailFingerprinter } from '../domain/email-fingerprinter.js';
import { LookupStatus } from '../domain/lookup-status.enum.js';
import { UserDirectory } from '../domain/user-directory.js';
import type { UserSnapshot } from '../domain/user-snapshot.js';
import type { UserState } from '../domain/user.js';
import { UserRepository } from '../domain/user.repository.js';

/** User reads: by email from the catalog and by reference from their shard. */
@Injectable()
export class UserReader {
  constructor(
    private readonly users: UserRepository,
    private readonly directory: UserDirectory,
    private readonly fingerprints: EmailFingerprinter,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Looks a user up by email through the catalog index.
   * @param email Email to find.
   * @returns The user, or `undefined`.
   */
  async findByEmail(email: string): Promise<UserSnapshot | undefined> {
    const lookup = await this.directory.findByFingerprint(
      this.fingerprints.fingerprint(normalizeEmail(email)),
    );
    if (lookup === undefined || lookup.status !== LookupStatus.Active) {
      return undefined;
    }
    return this.find(lookup);
  }

  /**
   * Reads a user that must exist.
   * @param ref User to read.
   * @returns The user.
   * @throws IdentityError `IDENTITY.USER.NOT_FOUND` if it does not exist.
   */
  async getByRef(ref: UserRef): Promise<UserSnapshot> {
    const user = await this.find(ref);
    if (user === undefined) {
      throw new IdentityError(IdentityErrorCode.UserNotFound);
    }
    return user;
  }

  /**
   * Finds the home tenant of a user in the catalog.
   * @param userId User to find.
   * @returns Its reference, or `undefined`.
   */
  async refOf(userId: string): Promise<UserRef | undefined> {
    const lookup = await this.directory.findByUserId(userId);
    return lookup === undefined || lookup.status !== LookupStatus.Active
      ? undefined
      : { userId: lookup.userId, homeTenantId: lookup.homeTenantId };
  }

  /**
   * Finds the home tenant of a user that must exist.
   * @param userId User to find.
   * @returns Its reference.
   * @throws IdentityError `IDENTITY.USER.NOT_FOUND` if the user does not exist.
   */
  async requireRef(userId: string): Promise<UserRef> {
    const ref = await this.refOf(userId);
    if (ref === undefined) {
      throw new IdentityError(IdentityErrorCode.UserNotFound);
    }
    return ref;
  }

  private async find(ref: UserRef): Promise<UserSnapshot | undefined> {
    const user = await this.scopes.inUserShard(ref, () =>
      this.users.find(ref.userId),
    );
    return user === undefined
      ? undefined
      : UserReader.snapshotOf(user.snapshot());
  }

  /**
   * Builds the snapshot other modules read from a user state.
   * @param state Stored user.
   * @returns The snapshot.
   */
  static snapshotOf(state: UserState): UserSnapshot {
    return {
      id: state.id,
      homeTenantId: state.homeTenantId,
      email: state.email,
      ...(state.emailVerifiedAt === undefined
        ? {}
        : { emailVerifiedAt: state.emailVerifiedAt }),
      status: state.status,
      displayName: state.displayName,
      locale: state.locale,
      ...(state.lastTenantId === undefined
        ? {}
        : { lastTenantId: state.lastTenantId }),
    };
  }
}
