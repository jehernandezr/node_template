import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { SNSClient } from '@aws-sdk/client-sns';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { SesEmailClient } from '../ses/ses-email-client.js';
import { SNS_CLIENT, SQS_CLIENT } from './aws.tokens.js';

/**
 * Closes the SDK clients on shutdown. Queue consumption lives in
 * `SqsConsumerModule`, which is not global and is destroyed earlier, so no
 * poller is still using the clients when they are closed.
 */
@Injectable()
export class AwsLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(SNS_CLIENT) private readonly sns: SNSClient,
    @Inject(SQS_CLIENT) private readonly sqs: SQSClient,
    @Inject(SesEmailClient) private readonly ses: SesEmailClient,
  ) {}

  /** Destroys the SQS, SNS and SES clients. */
  onModuleDestroy(): void {
    this.sqs.destroy();
    this.sns.destroy();
    this.ses.close();
  }
}
