import type { SecretInitialization } from '../secrets/secret-initialization.enum.js';

/** Writes the first value of a secret that was created empty, and never replaces a value it already has. */
export abstract class SecretInitializer {
  /**
   * Stores `value` as the first value of the secret, unless the secret already has one.
   * @param secretId ARN of the secret.
   * @param value Value to store when the secret is empty.
   * @returns Whether the value was written or the secret already had one.
   * @throws Error if the secret does not exist or cannot be read or written.
   */
  abstract initialize(
    secretId: string,
    value: string,
  ): Promise<SecretInitialization>;
}
