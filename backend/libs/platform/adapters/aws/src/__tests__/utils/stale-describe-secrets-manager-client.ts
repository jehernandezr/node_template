import {
  DescribeSecretCommand,
  type DescribeSecretCommandOutput,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { AWS_TEST_SETTINGS } from './aws-test-settings.js';

/**
 * Secrets Manager client that reports every secret as empty when described and sends every other command to a live
 * client. It stands in for a run that described a secret just before another run filled it.
 */
export class StaleDescribeSecretsManagerClient extends SecretsManagerClient {
  private static readonly EMPTY: Partial<DescribeSecretCommandOutput> = {
    VersionIdsToStages: {},
  };

  /**
   * @param live Client that receives every command but `DescribeSecret`.
   */
  constructor(private readonly live: SecretsManagerClient) {
    super({ region: AWS_TEST_SETTINGS.AWS_REGION });
  }

  override send = (async (
    command: Parameters<SecretsManagerClient['send']>[0],
  ) =>
    command instanceof DescribeSecretCommand
      ? StaleDescribeSecretsManagerClient.EMPTY
      : this.live.send(command)) as SecretsManagerClient['send'];
}
