import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Tells whether a user has passkeys, forgets them on erasure and follows a home tenant relocation. */
export abstract class PasskeysFacade {
  /** Whether the user has any passkey: if so, `mfa` offers it as a second factor. */
  abstract hasPasskeys(user: UserRef): Promise<boolean>;
  /** Deletes the user's passkeys and their global index: their account is being deleted. */
  abstract forget(user: UserRef): Promise<void>;
  /** Points to `region` the credential index of the users whose home tenant was moved. Idempotent. */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
