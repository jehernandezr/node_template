import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Lo que `passkeys` ofrece a los otros módulos. */
export abstract class PasskeysFacade {
  /** Si el usuario tiene alguna passkey: entonces `mfa` la ofrece como segundo factor. */
  abstract hasPasskeys(user: UserRef): Promise<boolean>;
}
