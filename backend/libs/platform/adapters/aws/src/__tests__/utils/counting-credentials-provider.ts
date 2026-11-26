import type { AwsCredentials } from '../../aws-credentials.js';
import { AwsCredentialsProvider } from '../../aws-credentials-provider.js';

/** Returns the given credentials and counts how many times they were requested. */
export class CountingCredentialsProvider extends AwsCredentialsProvider {
  resolutions = 0;

  constructor(private readonly credentials: AwsCredentials) {
    super();
  }

  override async resolve(): Promise<AwsCredentials> {
    this.resolutions += 1;
    return this.credentials;
  }
}
