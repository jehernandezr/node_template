import {
  CreateTopicCommand,
  type SNSClient,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import type { TopologyDocument } from '@platform/messaging';
import type { AwsMessagingNames } from '../../aws-messaging-names.js';

/**
 * Crea en LocalStack lo mismo que el módulo `messaging` de Terraform a partir
 * del documento de la topología: tópicos, colas con su DLQ y redrive, y
 * suscripciones con entrega cruda y filtro por `type` en el cuerpo.
 */
export class LocalStackProvisioner {
  constructor(
    private readonly sns: SNSClient,
    private readonly sqs: SQSClient,
    private readonly names: AwsMessagingNames,
  ) {}

  async provision(document: TopologyDocument): Promise<void> {
    const topicArns = new Map<string, string>();
    for (const topic of document.topics) {
      const output = await this.sns.send(
        new CreateTopicCommand({
          Name: this.names.topicName(topic.name, topic.fifo),
          Attributes: topic.fifo
            ? { FifoTopic: 'true', ContentBasedDeduplication: 'true' }
            : {},
        }),
      );
      topicArns.set(topic.name, output.TopicArn as string);
    }
    for (const queue of document.queues) {
      const fifo = queue.fifo
        ? { FifoQueue: 'true', ContentBasedDeduplication: 'true' }
        : {};
      const dlq = await this.sqs.send(
        new CreateQueueCommand({
          QueueName: this.names.deadLetterQueueName(queue.name, queue.fifo),
          Attributes: fifo,
        }),
      );
      const dlqArn = await this.queueArn(dlq.QueueUrl as string);
      const created = await this.sqs.send(
        new CreateQueueCommand({
          QueueName: this.names.queueName(queue.name, queue.fifo),
          Attributes: {
            ...fifo,
            VisibilityTimeout: String(queue.visibilityTimeoutSeconds),
            RedrivePolicy: JSON.stringify({
              deadLetterTargetArn: dlqArn,
              maxReceiveCount: queue.dlq.maxReceiveCount,
            }),
          },
        }),
      );
      const queueArn = await this.queueArn(created.QueueUrl as string);
      for (const subscription of queue.subscriptions) {
        await this.sns.send(
          new SubscribeCommand({
            TopicArn: topicArns.get(subscription.topic),
            Protocol: 'sqs',
            Endpoint: queueArn,
            Attributes: {
              RawMessageDelivery: 'true',
              ...(subscription.filterTypes.length > 0
                ? {
                    FilterPolicyScope: 'MessageBody',
                    FilterPolicy: JSON.stringify({
                      type: subscription.filterTypes,
                    }),
                  }
                : {}),
            },
          }),
        );
      }
    }
  }

  private async queueArn(queueUrl: string): Promise<string> {
    const output = await this.sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['QueueArn'],
      }),
    );
    return output.Attributes?.['QueueArn'] as string;
  }
}
