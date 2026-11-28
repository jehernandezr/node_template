import { type SecretInitialization, SecretInitializer } from '@platform/config';
import type { UseCase } from '@platform/kernel';
import { SigningKeySetGenerator } from '../domain/signing-key-set-generator.js';

/**
 * Fills the empty signing-key secret of a new environment with a fresh key set. A secret that already holds keys is
 * left as it is: later keys enter through the rotation runbook, never through this use case.
 */
export class ProvisionSigningKeys implements UseCase<
  string,
  SecretInitialization
> {
  constructor(
    private readonly secrets: SecretInitializer,
    private readonly keys: SigningKeySetGenerator,
  ) {}

  /**
   * Writes a new key set to the secret when it has no value.
   * @param secretId ARN of the signing-key secret.
   * @returns Whether the keys were written or the secret already had them.
   * @throws Error if the secret does not exist or cannot be described or written.
   */
  execute(secretId: string): Promise<SecretInitialization> {
    return this.secrets.initialize(secretId, this.keys.generate());
  }
}
