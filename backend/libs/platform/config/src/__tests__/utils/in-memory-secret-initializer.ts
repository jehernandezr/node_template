import { SecretInitializer } from '../../ports/secret-initializer.js';
import { SecretInitialization } from '../../secrets/secret-initialization.enum.js';

/** Secrets in memory by ARN: an absent ARN is an empty secret, which the first `initialize` fills. */
export class InMemorySecretInitializer extends SecretInitializer {
  private readonly values = new Map<string, string>();

  constructor(values: Readonly<Record<string, string>> = {}) {
    super();
    for (const [secretId, value] of Object.entries(values)) {
      this.values.set(secretId, value);
    }
  }

  override initialize(
    secretId: string,
    value: string,
  ): Promise<SecretInitialization> {
    if (this.values.has(secretId)) {
      return Promise.resolve(SecretInitialization.AlreadySet);
    }
    this.values.set(secretId, value);
    return Promise.resolve(SecretInitialization.Written);
  }

  /** The value of a secret, or `undefined` while it is empty. */
  stored(secretId: string): string | undefined {
    return this.values.get(secretId);
  }
}
