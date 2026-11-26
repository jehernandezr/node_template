import { PasswordHasher } from '../../domain/password-hasher.js';

/** Hasher whose hash is the password with a prefix, so a test can read which password was stored. */
export class ReversiblePasswordHasher extends PasswordHasher {
  static readonly PREFIX = 'hashed:';

  override async hash(password: string): Promise<string> {
    return `${ReversiblePasswordHasher.PREFIX}${password}`;
  }

  override async verify(password: string, hash: string): Promise<boolean> {
    return hash === `${ReversiblePasswordHasher.PREFIX}${password}`;
  }

  override needsRehash(): boolean {
    return false;
  }
}
