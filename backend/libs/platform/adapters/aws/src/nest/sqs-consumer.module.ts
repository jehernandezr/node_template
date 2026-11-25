import { Module, type DynamicModule } from '@nestjs/common';
import type { SqsConsumerModuleOptions } from './sqs-consumer-module-options.js';
import { SqsConsumerProviders } from './sqs-consumer.providers.js';

/**
 * Consumption of an SQS queue with the `MessageDispatcher` of `MessagingModule`:
 * `SqsDeliveryProcessor`, `SqsLambdaHandler` and, unless `poll: false`,
 * `SqsPoller`. It is intentionally not global: Nest starts global modules
 * before the others and destroys them after, so the poller starts when
 * `MessagingExplorer` has already registered the consumers and stops before
 * `AwsModule` closes the clients and `PersistenceModule` closes the database.
 * Requires `AwsModule`, `MessagingModule` and `ObservabilityModule` in the application.
 */
@Module({})
export class SqsConsumerModule {
  static forRoot(options: SqsConsumerModuleOptions): DynamicModule {
    return {
      module: SqsConsumerModule,
      providers: SqsConsumerProviders.build(options),
      exports: SqsConsumerProviders.exports(options),
    };
  }
}
