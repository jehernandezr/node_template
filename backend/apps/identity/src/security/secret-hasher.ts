/**
 * Hash of a single-use secret (codes, opaque tokens). The hash is stored, never the secret: a
 * copy of the database does not allow using the tokens it contains.
 */
export abstract class SecretHasher {
  /** Hash in base64url. Two calls with the same value give the same hash. */
  abstract digest(value: string | Uint8Array): string;

  /** Compares a value with a stored hash without revealing where they differ. */
  abstract matches(value: string | Uint8Array, digest: string): boolean;
}
