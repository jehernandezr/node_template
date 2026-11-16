import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { SNSClient } from '@aws-sdk/client-sns';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { SNS_CLIENT, SQS_CLIENT } from './aws.tokens.js';

/**
 * Cierra los clientes del SDK al apagar. El consumo de colas vive en
 * `SqsConsumerModule`, que no es global y se destruye antes, así que ningún
 * poller usa ya los clientes cuando se cierran.
 */
@Injectable()
export class AwsLifecycle implements OnModuleDestroy {
  constructor(
    @Inject(SNS_CLIENT) private readonly sns: SNSClient,
    @Inject(SQS_CLIENT) private readonly sqs: SQSClient,
  ) {}

  onModuleDestroy(): void {
    this.sqs.destroy();
    this.sns.destroy();
  }
}
