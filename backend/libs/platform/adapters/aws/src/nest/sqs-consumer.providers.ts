import type { Provider, Type } from '@nestjs/common';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { Clock } from '@platform/kernel';
import {
  MessageDispatcher,
  MessagingError,
  MessagingErrorCode,
} from '@platform/messaging';
import { LoggerPort } from '@platform/observability';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { SqsConsumerConfig } from '../sqs-consumer-config.js';
import { SqsDeadLetterRedriver } from '../sqs-dead-letter-redriver.js';
import { SqsDeliveryProcessor } from '../sqs-delivery-processor.js';
import { SqsLambdaHandler } from '../sqs-lambda-handler.js';
import { SqsPoller } from '../sqs-poller.js';
import { SqsConsumerLifecycle } from './sqs-consumer-lifecycle.js';
import { SqsConsumerModuleOptions } from './sqs-consumer-module-options.js';
import { SQS_CLIENT } from './aws.tokens.js';

/**
 * Providers of `SqsConsumerModule` for a topology queue. They are built
 * with `useFactory`, like those of `AwsProviders`.
 */
export class SqsConsumerProviders {
  static build(options: SqsConsumerModuleOptions): Provider[] {
    const queue = options.topology.queueFor(options.queue);
    if (!queue) {
      throw new MessagingError(
        MessagingErrorCode.UnknownQueue,
        `queue "${options.queue}" is not declared in the topology`,
      );
    }
    const providers: Provider[] = [
      {
        provide: SqsDeadLetterRedriver,
        useFactory: (
          sqs: SQSClient,
          names: AwsMessagingNames,
          logger: LoggerPort,
          errors: AwsErrorTranslator,
        ) =>
          new SqsDeadLetterRedriver(
            sqs,
            names,
            queue,
            logger.child({ queue: queue.name }),
            errors,
          ),
        inject: [SQS_CLIENT, AwsMessagingNames, LoggerPort, AwsErrorTranslator],
      },
      {
        provide: SqsDeliveryProcessor,
        useFactory: (
          sqs: SQSClient,
          names: AwsMessagingNames,
          dispatcher: MessageDispatcher,
          redriver: SqsDeadLetterRedriver,
          logger: LoggerPort,
          errors: AwsErrorTranslator,
        ) =>
          new SqsDeliveryProcessor(
            sqs,
            names,
            dispatcher,
            queue,
            redriver,
            logger.child({ queue: queue.name }),
            errors,
          ),
        inject: [
          SQS_CLIENT,
          AwsMessagingNames,
          MessageDispatcher,
          SqsDeadLetterRedriver,
          LoggerPort,
          AwsErrorTranslator,
        ],
      },
      {
        provide: SqsLambdaHandler,
        useFactory: (processor: SqsDeliveryProcessor) =>
          new SqsLambdaHandler(processor),
        inject: [SqsDeliveryProcessor],
      },
    ];
    if (options.poll !== false) {
      providers.push(
        {
          provide: SqsConsumerConfig,
          useValue: new SqsConsumerConfig(options.consumer),
        },
        {
          provide: SqsPoller,
          useFactory: (
            sqs: SQSClient,
            names: AwsMessagingNames,
            processor: SqsDeliveryProcessor,
            config: SqsConsumerConfig,
            logger: LoggerPort,
            errors: AwsErrorTranslator,
            clock: Clock,
          ) =>
            new SqsPoller(
              sqs,
              names,
              processor,
              queue,
              config,
              logger.child({ queue: queue.name }),
              errors,
              clock,
            ),
          inject: [
            SQS_CLIENT,
            AwsMessagingNames,
            SqsDeliveryProcessor,
            SqsConsumerConfig,
            LoggerPort,
            AwsErrorTranslator,
            Clock,
          ],
        },
      );
    }
    providers.push(SqsConsumerLifecycle);
    return providers;
  }

  /** What the service can inject: the processor and the Lambda handler, and the poller unless `poll: false`. */
  static exports(options: SqsConsumerModuleOptions): Array<Type<unknown>> {
    const exported: Array<Type<unknown>> = [
      SqsDeliveryProcessor,
      SqsLambdaHandler,
    ];
    if (options.poll !== false) {
      exported.push(SqsPoller);
    }
    return exported;
  }
}
