import type { SQSClient } from '@aws-sdk/client-sqs';
import type { AwsCredentials } from './aws-credentials.js';
import { AwsCredentialsProvider } from './aws-credentials-provider.js';

/**
 * Credentials from the SDK default chain, taken from an already created
 * client: so signing uses the same identity that publishes (Lambda role or
 * task role, or the LocalStack variables) without adding another SDK package.
 * The client stores them and renews them before they expire.
 */
export class SdkClientCredentialsProvider extends AwsCredentialsProvider {
  constructor(private readonly client: SQSClient) {
    super();
  }

  resolve(): Promise<AwsCredentials> {
    return this.client.config.credentials();
  }
}
