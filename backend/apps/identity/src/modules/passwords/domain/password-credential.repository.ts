import type { PasswordCredential } from './password-credential.js';

/** Contraseñas en el shard del usuario. */
export abstract class PasswordCredentialRepository {
  abstract find(userId: string): Promise<PasswordCredential | undefined>;

  /** Inserta o reemplaza la contraseña del usuario. */
  abstract save(credential: PasswordCredential): Promise<void>;

  abstract delete(userId: string): Promise<void>;
}
