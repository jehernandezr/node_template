import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import type { AwsSettings } from './aws.config.js';

/** What the factory needs to point to AWS or to LocalStack. */
export type AwsClientSettings = Pick<
  AwsSettings,
  'AWS_REGION' | 'AWS_ENDPOINT_URL'
>;

/**
 * Creates the SDK clients with the region and, locally, the LocalStack
 * endpoint. Whoever creates them closes them with `destroy()`.
 */
export class AwsClientFactory {
  /**
   * Creates the SNS client.
   * @param settings Region, endpoint and credentials.
   * @returns The client.
   */
  sns(settings: AwsClientSettings): SNSClient {
    return new SNSClient(this.options(settings));
  }

  /**
   * Creates the SQS client.
   * @param settings Region, endpoint and credentials.
   * @returns The client.
   */
  sqs(settings: AwsClientSettings): SQSClient {
    return new SQSClient(this.options(settings));
  }

  /**
   * Creates the SES client.
   * @param settings Region, endpoint and credentials.
   * @returns The client.
   */
  ses(settings: AwsClientSettings): SESv2Client {
    return new SESv2Client(this.options(settings));
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
