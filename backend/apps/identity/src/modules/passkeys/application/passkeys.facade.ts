import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** Lo que `passkeys` ofrece a los otros módulos. */
export abstract class PasskeysFacade {
  /** Si el usuario tiene alguna passkey: entonces `mfa` la ofrece como segundo factor. */
  abstract hasPasskeys(user: UserRef): Promise<boolean>;
  /** Borra las passkeys del usuario y su índice global: su cuenta se borra. */
  abstract forget(user: UserRef): Promise<void>;
  /** Apunta a `region` el índice de credenciales de los usuarios cuyo tenant de origen se trasladó. Idempotente. */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
