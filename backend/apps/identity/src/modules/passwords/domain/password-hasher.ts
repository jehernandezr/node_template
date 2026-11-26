/** Password hashing in PHC format. */
export abstract class PasswordHasher {
  /**
   * Hashes a password with the current parameters.
   * @param password Plain password.
   * @returns The encoded hash.
   */
  abstract hash(password: string): Promise<string>;

  /**
   * Compares in constant time. A malformed hash does not match.
   * @param password Plain password.
   * @param hash Stored hash.
   * @returns `true` when it matches.
   */
  abstract verify(password: string, hash: string): Promise<boolean>;

  /**
   * Whether the hash uses parameters different from the current ones and should be redone.
   * @param hash Stored hash.
   * @returns `true` when it should be rehashed.
   */
  abstract needsRehash(hash: string): boolean;
}
