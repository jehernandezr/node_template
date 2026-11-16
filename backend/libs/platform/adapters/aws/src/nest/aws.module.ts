import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { AwsConfig } from '../aws.config.js';
import type { AwsModuleOptions } from './aws-module-options.js';
import { AwsProviders } from './aws.providers.js';

/**
 * Cableado del adaptador de AWS: clientes de SNS y SQS, nombres físicos,
 * traductor de errores, publicador y bus sobre SNS y SQS, y el proveedor del
 * token IAM de ElastiCache. Es global y cierra los clientes en su
 * `onModuleDestroy`: Nest destruye los módulos globales después de los demás,
 * así el consumo de la cola (`SqsConsumerModule`, que no es global) ya se
 * detuvo. Solo tiene `forRoot`: sus opciones (la topología) no salen del
 * entorno, y qué providers registra depende de ellas.
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
