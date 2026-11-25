import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { Passkey } from './passkey.js';

/** Passkeys in the user's shard. */
export abstract class PasskeyRepository {
  abstract list(userId: string): Promise<readonly Passkey[]>;
  abstract findByCredential(
    userId: string,
    credentialId: string,
  ): Promise<Passkey | undefined>;
  abstract insert(passkey: Passkey): Promise<void>;
  abstract update(passkey: Passkey): Promise<void>;
  abstract delete(
    userId: string,
    passkeyId: string,
  ): Promise<Passkey | undefined>;
}

/** Global credential index (`passkey_lookup`): passwordless sign-in reaches the shard through them. */
export abstract class PasskeyDirectory {
  abstract register(
    credentialId: string,
    user: UserRef,
    region: string,
  ): Promise<void>;
  abstract ownerOf(credentialId: string): Promise<UserRef | undefined>;
  abstract remove(credentialId: string): Promise<void>;
  /** Points to `region` the credentials of the users whose home tenant is `homeTenantId`. */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
