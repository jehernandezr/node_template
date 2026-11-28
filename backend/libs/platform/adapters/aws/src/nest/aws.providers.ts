import type { Abstract, Provider, Type } from '@nestjs/common';
import type { SNSClient } from '@aws-sdk/client-sns';
import type { SESv2Client } from '@aws-sdk/client-sesv2';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { Clock, IdGenerator } from '@platform/kernel';
import { TraceContextRestorer } from '@platform/observability';
import { AwsClientFactory } from '../aws-client-factory.js';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { type AwsSettings, AwsConfig } from '../aws.config.js';
import { AwsCredentialsProvider } from '../aws-credentials-provider.js';
import { ElastiCacheIamAuthTokenProvider } from '../elasticache-iam-auth-token-provider.js';
import { RdsIamDatabaseTokenProvider } from '../rds/rds-iam-database-token-provider.js';
import { SdkClientCredentialsProvider } from '../sdk-client-credentials-provider.js';
import { SesEmailClient } from '../ses/ses-email-client.js';
import { SnsSqsEnvelopePublisher } from '../sns-sqs-envelope-publisher.js';
import { SnsSqsMessageBus } from '../sns-sqs-message-bus.js';
import type { AwsModuleOptions } from './aws-module-options.js';
import { AwsLifecycle } from './aws-lifecycle.js';
import { SES_CLIENT, SNS_CLIENT, SQS_CLIENT } from './aws.tokens.js';

/**
 * Providers of `AwsModule`. All are built with `useFactory` because the core
 * of the library has no decorators; only `AwsLifecycle` is a Nest class.
 */
export class AwsProviders {
  /**
   * Builds the AWS providers of the enabled adapters.
   * @param options Region, endpoint and adapters to enable.
   * @returns The providers.
   */
  static build(options: AwsModuleOptions): Provider[] {
    const providers: Provider[] = [
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
        provide: SES_CLIENT,
        useFactory: (settings: AwsSettings, factory: AwsClientFactory) =>
          factory.ses(settings),
        inject: [AwsConfig.token, AwsClientFactory],
      },
      {
        provide: SesEmailClient,
        useFactory: (ses: SESv2Client, errors: AwsErrorTranslator) =>
          new SesEmailClient(ses, errors),
        inject: [SES_CLIENT, AwsErrorTranslator],
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
            restorer,
          }),
        inject: [
          SnsSqsEnvelopePublisher,
          Clock,
          IdGenerator,
          TraceContextRestorer,
        ],
      });
    }
    providers.push({
      provide: AwsCredentialsProvider,
      useFactory: (sqs: SQSClient) => new SdkClientCredentialsProvider(sqs),
      inject: [SQS_CLIENT],
    });
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
    if (options.rdsIam === true) {
      providers.push({
        provide: RdsIamDatabaseTokenProvider,
        useFactory: (settings: AwsSettings, sqs: SQSClient, clock: Clock) =>
          new RdsIamDatabaseTokenProvider(
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

  /**
   * What other modules receive: the clients, the names and the ports that were registered.
   * @param options Region, endpoint and adapters to enable.
   * @returns The tokens.
   */
  static exports(
    options: AwsModuleOptions,
  ): Array<symbol | Type<unknown> | Abstract<unknown>> {
    const exported: Array<symbol | Type<unknown> | Abstract<unknown>> = [
      SNS_CLIENT,
      SQS_CLIENT,
      SesEmailClient,
      AwsErrorTranslator,
      AwsMessagingNames,
      SnsSqsEnvelopePublisher,
      AwsCredentialsProvider,
    ];
    if (options.messaging !== undefined) {
      exported.push(SnsSqsMessageBus);
    }
    if (options.elastiCache === true) {
      exported.push(ElastiCacheIamAuthTokenProvider);
    }
    if (options.rdsIam === true) {
      exported.push(RdsIamDatabaseTokenProvider);
    }
    return exported;
  }
}
