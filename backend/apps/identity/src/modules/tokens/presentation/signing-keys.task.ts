import {
  AwsClientFactory,
  SecretsManagerSecretInitializer,
} from '@platform/adapters-aws';
import {
  type ConfigEnv,
  ConfigLoader,
  type SecretInitialization,
} from '@platform/config';
import { ProvisionSigningKeys } from '../application/provision-signing-keys.use-case.js';
import { Es256SigningKeySetGenerator } from '../infrastructure/es256-signing-key-set-generator.js';
import { signingKeysTaskConfigSchema } from './signing-keys-task.config.js';

/**
 * The `signing-keys` one-off task: fills the empty identity signing-key secret of an environment and leaves a filled
 * one unchanged, so the pipeline may run it on every deploy.
 */
export class SigningKeysTask {
  constructor(private readonly clients: AwsClientFactory) {}

  /**
   * Runs the task once.
   * @param env Environment of the task.
   * @returns Whether the keys were written or the secret already had them.
   * @throws ConfigValidationError (`PLATFORM.CONFIG.INVALID`) if the environment lacks the region or the secret ARN.
   * @throws Error if the secret does not exist or cannot be described or written.
   */
  async run(env: ConfigEnv): Promise<SecretInitialization> {
    const config = new ConfigLoader(env).load(signingKeysTaskConfigSchema);
    const client = this.clients.secretsManager(config);
    try {
      return await new ProvisionSigningKeys(
        new SecretsManagerSecretInitializer(client),
        new Es256SigningKeySetGenerator(),
      ).execute(config.IDENTITY_SIGNING_KEYS_SECRET_ARN);
    } finally {
      client.destroy();
    }
  }
}
