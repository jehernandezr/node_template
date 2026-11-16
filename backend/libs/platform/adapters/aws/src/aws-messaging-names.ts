import { GetQueueUrlCommand, type SQSClient } from '@aws-sdk/client-sqs';
import { DEAD_LETTER_SUFFIX } from '@contracts/platform';
import type { AwsErrorTranslator } from './aws-error-translator.js';
import { AwsOperation } from './aws-operation.enum.js';
import type { AwsSettings } from './aws.config.js';

/** Lo que `AwsMessagingNames` lee de la configuración. */
export type AwsNamingSettings = Pick<
  AwsSettings,
  'AWS_REGION' | 'AWS_ACCOUNT_ID' | 'MESSAGING_NAME_PREFIX'
>;

/**
 * Traduce los nombres lógicos de la topología a los físicos que crea Terraform
 * (`modules/messaging`): `<prefijo>-<nombre>[.fifo]` y `<prefijo>-<nombre>-dlq[.fifo]`.
 * Resuelve las URLs de las colas con `GetQueueUrl` y las guarda.
 */
export class AwsMessagingNames {
  /** Sufijo obligatorio de tópicos y colas FIFO. */
  static readonly FIFO_SUFFIX = '.fifo';

  private readonly urls = new Map<string, Promise<string>>();

  constructor(
    private readonly settings: AwsNamingSettings,
    private readonly sqs: SQSClient,
    private readonly errors: AwsErrorTranslator,
  ) {}

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
    const { AWS_REGION: region, AWS_ACCOUNT_ID: account } = this.settings;
    return `arn:${this.partition(region)}:sns:${region}:${account}:${this.topicName(name, fifo)}`;
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
          QueueOwnerAWSAccountId: this.settings.AWS_ACCOUNT_ID,
        }),
      );
      if (!output.QueueUrl) throw new Error('GetQueueUrl returned no URL');
      return output.QueueUrl;
    } catch (err) {
      throw this.errors.translate(AwsOperation.GetQueueUrl, err, physicalName);
    }
  }

  /** Partición del ARN según la región. */
  private partition(region: string): string {
    if (region.startsWith('cn-')) return 'aws-cn';
    if (region.startsWith('us-gov-')) return 'aws-us-gov';
    return 'aws';
  }

  private physical(name: string, fifo: boolean): string {
    return `${this.settings.MESSAGING_NAME_PREFIX}-${name}${fifo ? AwsMessagingNames.FIFO_SUFFIX : ''}`;
  }
}
