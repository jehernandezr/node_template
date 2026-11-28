import {
  DescribeSecretCommand,
  PutSecretValueCommand,
  ResourceExistsException,
  type SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { SecretInitialization, SecretInitializer } from '@platform/config';

/**
 * Writes the first value of a Secrets Manager secret created without one. It only describes the secret to learn
 * whether a current version exists, so it never reads a value. The write carries a fixed client request
 * token, so of two runs that race on the same empty secret only one value is stored and the other run finds it set.
 */
export class SecretsManagerSecretInitializer extends SecretInitializer {
  /** Client request token of the first version of every secret this class fills. */
  static readonly FIRST_VERSION_TOKEN = '00000000-0000-4000-8000-000000000001';

  private static readonly CURRENT_STAGE = 'AWSCURRENT';

  constructor(private readonly client: SecretsManagerClient) {
    super();
  }

  override async initialize(
    secretId: string,
    value: string,
  ): Promise<SecretInitialization> {
    if (await this.hasValue(secretId)) {
      return SecretInitialization.AlreadySet;
    }
    try {
      await this.client.send(
        new PutSecretValueCommand({
          SecretId: secretId,
          SecretString: value,
          ClientRequestToken:
            SecretsManagerSecretInitializer.FIRST_VERSION_TOKEN,
        }),
      );
      return SecretInitialization.Written;
    } catch (error) {
      if (error instanceof ResourceExistsException) {
        return SecretInitialization.AlreadySet;
      }
      throw error;
    }
  }

  private async hasValue(secretId: string): Promise<boolean> {
    const output = await this.client.send(
      new DescribeSecretCommand({ SecretId: secretId }),
    );
    return Object.values(output.VersionIdsToStages ?? {}).some((stages) =>
      stages.includes(SecretsManagerSecretInitializer.CURRENT_STAGE),
    );
  }
}
