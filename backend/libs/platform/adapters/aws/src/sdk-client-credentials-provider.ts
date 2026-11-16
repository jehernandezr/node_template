import type { SQSClient } from '@aws-sdk/client-sqs';
import type { AwsCredentials } from './aws-credentials.js';
import { AwsCredentialsProvider } from './aws-credentials-provider.js';

/**
 * Credenciales de la cadena por defecto del SDK, tomadas de un cliente ya
 * creado: así se firma con la misma identidad que publica (rol de la Lambda o
 * de la tarea, o las variables de LocalStack) sin sumar otro paquete del SDK.
 * El cliente las guarda y las renueva antes de que venzan.
 */
export class SdkClientCredentialsProvider extends AwsCredentialsProvider {
  constructor(private readonly client: SQSClient) {
    super();
  }

  resolve(): Promise<AwsCredentials> {
    return this.client.config.credentials();
  }
}
