/** Creates the first signing keys of an environment. */
export abstract class SigningKeySetGenerator {
  /**
   * Creates a new key set with one active key.
   * @returns The set as `IDENTITY_SIGNING_KEYS` holds it: a JSON array of private JWKs.
   */
  abstract generate(): string;
}
