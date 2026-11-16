import { Module, type DynamicModule } from '@nestjs/common';
import type { SqsConsumerModuleOptions } from './sqs-consumer-module-options.js';
import { SqsConsumerProviders } from './sqs-consumer.providers.js';

/**
 * Consumo de una cola SQS con el `MessageDispatcher` de `MessagingModule`:
 * `SqsDeliveryProcessor`, `SqsLambdaHandler` y, salvo `poll: false`,
 * `SqsPoller`. No es global a propósito: Nest arranca los módulos globales
 * antes que los demás y los destruye después, así el poller empieza cuando
 * `MessagingExplorer` ya registró los consumidores y se detiene antes de que
 * `AwsModule` cierre los clientes y `PersistenceModule` cierre la base.
 * Necesita `AwsModule`, `MessagingModule` y `ObservabilityModule` en la aplicación.
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
