/** Password hashing in PHC format. */
export abstract class PasswordHasher {
  abstract hash(password: string): Promise<string>;

  /** Compares in constant time. A malformed hash does not match. */
  abstract verify(password: string, hash: string): Promise<boolean>;

  /** Whether the hash uses parameters different from the current ones and should be redone. */
  abstract needsRehash(hash: string): boolean;
}
