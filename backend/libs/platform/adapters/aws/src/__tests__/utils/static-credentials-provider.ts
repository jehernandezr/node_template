import type { AwsCredentials } from '../../aws-credentials.js';
import { AwsCredentialsProvider } from '../../aws-credentials-provider.js';

/** Entrega siempre las mismas credenciales, sin consultar la cadena del SDK. */
export class StaticCredentialsProvider extends AwsCredentialsProvider {
  constructor(private readonly credentials: AwsCredentials) {
    super();
  }

  async resolve(): Promise<AwsCredentials> {
    return this.credentials;
  }
}
