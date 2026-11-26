import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type {
  PasskeyOptions,
  PasskeyPage,
  PasskeySummary,
  RegisterPasskeyRequest,
} from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { UsersFacade } from '../../users/index.js';
import type { Passkey } from '../domain/passkey.js';
import {
  PasskeyDirectory,
  PasskeyRepository,
} from '../domain/passkey-store.js';
import { WebAuthnPurpose } from '../domain/webauthn-challenge.js';
import { WebAuthnVerifier } from '../domain/webauthn-verifier.js';
import { PasskeyCeremony } from './passkey-ceremony.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';

/** Registration, listing and removal of the user's passkeys. */
@Injectable()
export class ManagePasskeys {
  constructor(
    private readonly ceremony: PasskeyCeremony,
    private readonly passkeys: PasskeyRepository,
    private readonly directory: PasskeyDirectory,
    private readonly webauthn: WebAuthnVerifier,
    private readonly users: UsersFacade,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * Starts the registration of a passkey for the user.
   * @param user Signed-in user.
   * @returns The WebAuthn options with their challenge.
   */
  async registrationOptions(user: UserRef): Promise<PasskeyOptions> {
    const snapshot = await this.users.getByRef(user);
    const existing = await this.ceremony.userPasskeys(user);
    return this.ceremony.begin(
      WebAuthnPurpose.Registration,
      user,
      (challenge) =>
        this.webauthn.registrationOptions({
          challenge,
          userId: user.userId,
          userName: snapshot.email,
          exclude: existing,
        }),
    );
  }

  /**
   * Verifies and stores a new passkey of the user.
   * @param user Signed-in user.
   * @param request Challenge id and the authenticator response.
   * @returns The new passkey.
   */
  async register(
    user: UserRef,
    request: RegisterPasskeyRequest,
  ): Promise<PasskeySummary> {
    const challenge = await this.ceremony.take(
      request.challengeId,
      WebAuthnPurpose.Registration,
    );
    if (challenge.userId !== user.userId) {
      throw PasskeyCeremony.failed();
    }
    const verified = await this.webauthn.verifyRegistration(
      this.ceremony.credential(request.credentialJson),
      challenge.challenge,
    );
    if (verified === undefined) {
      throw PasskeyCeremony.failed();
    }
    const passkey: Passkey = {
      id: this.ids.next().toString(),
      userId: user.userId,
      credentialId: verified.credentialId,
      publicKey: verified.publicKey,
      signCount: verified.signCount,
      transports: verified.transports,
      aaguid: verified.aaguid,
      backedUp: verified.backedUp,
      name: request.name,
      createdAt: this.clock.now(),
    };
    await this.directory.register(
      passkey.credentialId,
      user,
      this.settings.values.IDENTITY_REGION,
    );
    await this.scopes.inUserShard(user, () =>
      this.transactions.runInTransaction(() => this.passkeys.insert(passkey)),
    );
    return ManagePasskeys.summary(passkey);
  }

  /**
   * Lists the user's passkeys.
   * @param user Signed-in user.
   * @returns Its passkeys.
   */
  async list(user: UserRef): Promise<PasskeyPage> {
    const passkeys = await this.ceremony.userPasskeys(user);
    return {
      items: passkeys.map((passkey) => ManagePasskeys.summary(passkey)),
      nextCursor: null,
    };
  }

  /**
   * Removes a passkey of the user.
   * @param user Signed-in user.
   * @param passkeyId Passkey to remove.
   */
  async remove(user: UserRef, passkeyId: string): Promise<void> {
    const removed = await this.scopes.inUserShard(user, () =>
      this.transactions.runInTransaction(() =>
        this.passkeys.delete(user.userId, passkeyId),
      ),
    );
    if (removed === undefined) {
      throw IdentityError.notFound();
    }
    await this.directory.remove(removed.credentialId);
  }

  /**
   * Builds the API view of a passkey.
   * @param passkey Stored passkey.
   * @returns Its summary.
   */
  static summary(passkey: Passkey): PasskeySummary {
    return {
      id: passkey.id,
      name: passkey.name,
      createdAt: passkey.createdAt.toISOString(),
      lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
      backedUp: passkey.backedUp,
    };
  }
}
