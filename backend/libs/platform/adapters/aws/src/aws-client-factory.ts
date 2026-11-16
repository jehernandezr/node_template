import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import type { AwsSettings } from './aws.config.js';

/** Lo que la fábrica necesita para apuntar a AWS o a LocalStack. */
export type AwsClientSettings = Pick<
  AwsSettings,
  'AWS_REGION' | 'AWS_ENDPOINT_URL'
>;

/**
 * Crea los clientes del SDK con la región y, en local, el endpoint de
 * LocalStack. Quien los crea los cierra con `destroy()`.
 */
export class AwsClientFactory {
  sns(settings: AwsClientSettings): SNSClient {
    return new SNSClient(this.options(settings));
  }

  sqs(settings: AwsClientSettings): SQSClient {
    return new SQSClient(this.options(settings));
  }

  private options(settings: AwsClientSettings) {
    return {
      region: settings.AWS_REGION,
      ...(settings.AWS_ENDPOINT_URL === undefined
        ? {}
        : { endpoint: settings.AWS_ENDPOINT_URL }),
    };
  }
}
