import type { Provider, Type } from '@nestjs/common';
import type { SNSClient } from '@aws-sdk/client-sns';
import type { SQSClient } from '@aws-sdk/client-sqs';
import {
  Clock,
  IdGenerator,
  RandomSource,
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';
import { TraceContextRestorer } from '@platform/observability';
import { AwsClientFactory } from '../aws-client-factory.js';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { type AwsSettings, AwsConfig } from '../aws.config.js';
import { ElastiCacheIamAuthTokenProvider } from '../elasticache-iam-auth-token-provider.js';
import { SdkClientCredentialsProvider } from '../sdk-client-credentials-provider.js';
import { SnsSqsEnvelopePublisher } from '../sns-sqs-envelope-publisher.js';
import { SnsSqsMessageBus } from '../sns-sqs-message-bus.js';
import type { AwsModuleOptions } from './aws-module-options.js';
import { AwsLifecycle } from './aws-lifecycle.js';
import { SNS_CLIENT, SQS_CLIENT } from './aws.tokens.js';

/**
 * Proveedores de `AwsModule`. Todos se arman con `useFactory` porque el núcleo
 * de la librería no lleva decoradores; solo `AwsLifecycle` es una clase de Nest.
 */
export class AwsProviders {
  static build(options: AwsModuleOptions): Provider[] {
    const providers: Provider[] = [
      { provide: Clock, useFactory: () => new SystemClock() },
      { provide: RandomSource, useFactory: () => new SystemRandomSource() },
      {
        provide: IdGenerator,
        useFactory: (clock: Clock, random: RandomSource) =>
          new UuidV7IdGenerator(clock, random),
        inject: [Clock, RandomSource],
      },
      { provide: AwsClientFactory, useFactory: () => new AwsClientFactory() },
      {
        provide: AwsErrorTranslator,
        useFactory: () => new AwsErrorTranslator(),
      },
      {
        provide: SNS_CLIENT,
        useFactory: (settings: AwsSettings, factory: AwsClientFactory) =>
          factory.sns(settings),
        inject: [AwsConfig.token, AwsClientFactory],
      },
      {
        provide: SQS_CLIENT,
        useFactory: (settings: AwsSettings, factory: AwsClientFactory) =>
          factory.sqs(settings),
        inject: [AwsConfig.token, AwsClientFactory],
      },
      {
        provide: AwsMessagingNames,
        useFactory: (
          settings: AwsSettings,
          sqs: SQSClient,
          errors: AwsErrorTranslator,
        ) => new AwsMessagingNames(settings, sqs, errors),
        inject: [AwsConfig.token, SQS_CLIENT, AwsErrorTranslator],
      },
      {
        provide: SnsSqsEnvelopePublisher,
        useFactory: (
          sns: SNSClient,
          sqs: SQSClient,
          names: AwsMessagingNames,
          errors: AwsErrorTranslator,
        ) => new SnsSqsEnvelopePublisher(sns, sqs, names, errors),
        inject: [SNS_CLIENT, SQS_CLIENT, AwsMessagingNames, AwsErrorTranslator],
      },
    ];
    if (options.messaging !== undefined) {
      const { topology, source } = options.messaging;
      providers.push({
        provide: SnsSqsMessageBus,
        useFactory: (
          publisher: SnsSqsEnvelopePublisher,
          clock: Clock,
          ids: IdGenerator,
          restorer: TraceContextRestorer,
        ) =>
          new SnsSqsMessageBus({
            topology,
            source,
            publisher,
            clock,
            ids,
            traceparent: () => restorer.current(),
          }),
        inject: [
          SnsSqsEnvelopePublisher,
          Clock,
          IdGenerator,
          TraceContextRestorer,
        ],
      });
    }
    if (options.elastiCache === true) {
      providers.push({
        provide: ElastiCacheIamAuthTokenProvider,
        useFactory: (settings: AwsSettings, sqs: SQSClient, clock: Clock) =>
          new ElastiCacheIamAuthTokenProvider(
            settings.AWS_REGION,
            new SdkClientCredentialsProvider(sqs),
            clock,
          ),
        inject: [AwsConfig.token, SQS_CLIENT, Clock],
      });
    }
    providers.push(AwsLifecycle);
    return providers;
  }

  /** Lo que otros módulos reciben: los clientes, los nombres y los puertos que se registraron. */
  static exports(options: AwsModuleOptions): Array<symbol | Type<unknown>> {
    const exported: Array<symbol | Type<unknown>> = [
      SNS_CLIENT,
      SQS_CLIENT,
      AwsErrorTranslator,
      AwsMessagingNames,
      SnsSqsEnvelopePublisher,
    ];
    if (options.messaging !== undefined) {
      exported.push(SnsSqsMessageBus);
    }
    if (options.elastiCache === true) {
      exported.push(ElastiCacheIamAuthTokenProvider);
    }
    return exported;
  }
}
