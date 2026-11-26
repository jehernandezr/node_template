import type { AwsCredentials } from '../../aws-credentials.js';
import { AwsCredentialsProvider } from '../../aws-credentials-provider.js';

/** Always returns the same credentials, without querying the SDK chain. */
export class StaticCredentialsProvider extends AwsCredentialsProvider {
  constructor(private readonly credentials: AwsCredentials) {
    super();
  }

  override async resolve(): Promise<AwsCredentials> {
    return this.credentials;
  }
}
