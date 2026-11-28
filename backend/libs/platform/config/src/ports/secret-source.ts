import type { SecretReference } from '../secrets/secret-reference.js';

/** Reads the current values of secrets from the secret store. */
export abstract class SecretSource {
  /**
   * Reads the current value of every reference.
   * @param references What to read and the variable each value goes to.
   * @returns The value of each variable, by variable name.
   * @throws Error if a secret cannot be read, has no current value or lacks the JSON key a reference names; the
   *   message names the variables, never a value.
   */
  abstract read(
    references: readonly SecretReference[],
  ): Promise<ReadonlyMap<string, string>>;
}
