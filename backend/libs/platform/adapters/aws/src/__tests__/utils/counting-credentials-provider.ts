import type { AwsCredentials } from '../../aws-credentials.js';
import { AwsCredentialsProvider } from '../../aws-credentials-provider.js';

/** Entrega las credenciales dadas y cuenta cuántas veces se le pidieron. */
export class CountingCredentialsProvider extends AwsCredentialsProvider {
  resolutions = 0;

  constructor(private readonly credentials: AwsCredentials) {
    super();
  }

  async resolve(): Promise<AwsCredentials> {
    this.resolutions += 1;
    return this.credentials;
  }
}
