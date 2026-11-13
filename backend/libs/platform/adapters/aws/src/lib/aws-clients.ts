import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import type { AwsConfig } from './aws-config.js';

/** Clientes de mensajería configurados con la región y, en local, el endpoint de LocalStack. */
export interface AwsMessagingClients {
  readonly sns: SNSClient;
  readonly sqs: SQSClient;
}

function clientOptions(
  config: Pick<AwsConfig, 'AWS_REGION' | 'AWS_ENDPOINT_URL'>,
) {
  return {
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL === undefined
      ? {}
      : { endpoint: config.AWS_ENDPOINT_URL }),
  };
}

/** Crea los clientes de SNS y SQS. Cerrarlos con `destroyAwsMessagingClients`. */
export function createAwsMessagingClients(
  config: Pick<AwsConfig, 'AWS_REGION' | 'AWS_ENDPOINT_URL'>,
): AwsMessagingClients {
  const options = clientOptions(config);
  return { sns: new SNSClient(options), sqs: new SQSClient(options) };
}

/** Libera los sockets de los clientes. */
export function destroyAwsMessagingClients(clients: AwsMessagingClients): void {
  clients.sns.destroy();
  clients.sqs.destroy();
}
