import { GetQueueUrlCommand, type SQSClient } from '@aws-sdk/client-sqs';
import { DEAD_LETTER_SUFFIX } from '@contracts/platform';
import type { AwsConfig } from './aws-config.js';
import { AwsOperation, transportError } from './aws-errors.js';

/** Sufijo obligatorio de tópicos y colas FIFO. */
export const FIFO_SUFFIX = '.fifo';

/** Partición del ARN según la región. */
export function partitionOf(region: string): string {
  if (region.startsWith('cn-')) return 'aws-cn';
  if (region.startsWith('us-gov-')) return 'aws-us-gov';
  return 'aws';
}

/**
 * Traduce los nombres lógicos de la topología a los físicos que crea Terraform
 * (`modules/messaging`): `<prefijo>-<nombre>[.fifo]` y `<prefijo>-<nombre>-dlq[.fifo]`.
 * Resuelve las URLs de las colas con `GetQueueUrl` y las guarda.
 */
export class AwsMessagingNames {
  private readonly config: Pick<
    AwsConfig,
    'AWS_REGION' | 'AWS_ACCOUNT_ID' | 'MESSAGING_NAME_PREFIX'
  >;
  private readonly sqs: SQSClient;
  private readonly urls = new Map<string, Promise<string>>();

  constructor(
    config: Pick<
      AwsConfig,
      'AWS_REGION' | 'AWS_ACCOUNT_ID' | 'MESSAGING_NAME_PREFIX'
    >,
    sqs: SQSClient,
  ) {
    this.config = config;
    this.sqs = sqs;
  }

  topicName(name: string, fifo: boolean): string {
    return this.physical(name, fifo);
  }

  queueName(name: string, fifo: boolean): string {
    return this.physical(name, fifo);
  }

  deadLetterQueueName(name: string, fifo: boolean): string {
    return this.physical(`${name}${DEAD_LETTER_SUFFIX}`, fifo);
  }

  topicArn(name: string, fifo: boolean): string {
    const { AWS_REGION: region, AWS_ACCOUNT_ID: account } = this.config;
    return `arn:${partitionOf(region)}:sns:${region}:${account}:${this.topicName(name, fifo)}`;
  }

  /** URL de una cola por su nombre físico. Un fallo no queda en caché. */
  queueUrl(physicalName: string): Promise<string> {
    let url = this.urls.get(physicalName);
    if (!url) {
      url = this.lookup(physicalName);
      this.urls.set(physicalName, url);
      url.catch(() => this.urls.delete(physicalName));
    }
    return url;
  }

  private async lookup(physicalName: string): Promise<string> {
    try {
      const output = await this.sqs.send(
        new GetQueueUrlCommand({
          QueueName: physicalName,
          QueueOwnerAWSAccountId: this.config.AWS_ACCOUNT_ID,
        }),
      );
      if (!output.QueueUrl) throw new Error('GetQueueUrl returned no URL');
      return output.QueueUrl;
    } catch (err) {
      throw transportError(AwsOperation.GetQueueUrl, err, physicalName);
    }
  }

  private physical(name: string, fifo: boolean): string {
    return `${this.config.MESSAGING_NAME_PREFIX}-${name}${fifo ? FIFO_SUFFIX : ''}`;
  }
}
