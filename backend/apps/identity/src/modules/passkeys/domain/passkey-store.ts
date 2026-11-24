import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { Passkey } from './passkey.js';

/** Passkeys en el shard del usuario. */
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

/** Índice global de credenciales (`passkey_lookup`): el inicio de sesión sin usuario llega al shard por ellas. */
export abstract class PasskeyDirectory {
  abstract register(
    credentialId: string,
    user: UserRef,
    region: string,
  ): Promise<void>;
  abstract ownerOf(credentialId: string): Promise<UserRef | undefined>;
  abstract remove(credentialId: string): Promise<void>;
  /** Apunta a `region` las credenciales de los usuarios cuyo tenant de origen es `homeTenantId`. */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
