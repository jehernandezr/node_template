import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { AwsConfig } from '../aws.config.js';
import type { AwsModuleOptions } from './aws-module-options.js';
import { AwsProviders } from './aws.providers.js';

/**
 * Wiring of the AWS adapter: SNS, SQS and SES clients, physical names,
 * error translator, publisher and bus over SNS and SQS, and the ElastiCache
 * IAM token provider. It is global and closes the clients in its
 * `onModuleDestroy`: Nest destroys global modules after the others,
 * so queue consumption (`SqsConsumerModule`, which is not global) has already
 * stopped. It only has `forRoot`: its options (the topology) do not come from the
 * environment, and which providers it registers depends on them.
 */
@Module({})
export class AwsModule {
  static forRoot(options: AwsModuleOptions = {}): DynamicModule {
    return {
      module: AwsModule,
      global: true,
      imports: [ConfigModule.forFeature(AwsConfig)],
      providers: AwsProviders.build(options),
      exports: AwsProviders.exports(options),
    };
  }
}
