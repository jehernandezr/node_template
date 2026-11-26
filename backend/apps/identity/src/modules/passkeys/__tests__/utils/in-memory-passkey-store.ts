import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import type { Passkey } from '../../domain/passkey.js';
import {
  PasskeyDirectory,
  PasskeyRepository,
} from '../../domain/passkey-store.js';

/** Passkeys kept in memory, per user. */
export class InMemoryPasskeyRepository extends PasskeyRepository {
  private readonly passkeys = new Map<string, Passkey>();

  override async list(userId: string): Promise<readonly Passkey[]> {
    return [...this.passkeys.values()].filter(
      (passkey) => passkey.userId === userId,
    );
  }

  override async findByCredential(
    userId: string,
    credentialId: string,
  ): Promise<Passkey | undefined> {
    return [...this.passkeys.values()].find(
      (passkey) =>
        passkey.userId === userId && passkey.credentialId === credentialId,
    );
  }

  override async insert(passkey: Passkey): Promise<void> {
    this.passkeys.set(passkey.id, passkey);
  }

  override async update(passkey: Passkey): Promise<void> {
    this.passkeys.set(passkey.id, passkey);
  }

  override async delete(
    userId: string,
    passkeyId: string,
  ): Promise<Passkey | undefined> {
    const passkey = this.passkeys.get(passkeyId);
    if (passkey?.userId !== userId) {
      return undefined;
    }
    this.passkeys.delete(passkeyId);
    return passkey;
  }
}

/** The global catalog of which user owns each credential, in memory. */
export class InMemoryPasskeyDirectory extends PasskeyDirectory {
  private readonly owners = new Map<string, UserRef>();

  override async register(credentialId: string, user: UserRef): Promise<void> {
    this.owners.set(credentialId, user);
  }

  override async ownerOf(credentialId: string): Promise<UserRef | undefined> {
    return this.owners.get(credentialId);
  }

  override async remove(credentialId: string): Promise<void> {
    this.owners.delete(credentialId);
  }

  override async relocateHomeTenant(): Promise<void> {
    return undefined;
  }
}
