import {
  Injectable,
  Optional,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { SqsPoller } from '../sqs-poller.js';

/**
 * Arranca el poller cuando la aplicación termina de arrancar y lo detiene al
 * apagar, antes de que `AwsModule` cierre los clientes. Sin poller (`poll:
 * false`) no hace nada.
 */
@Injectable()
export class SqsConsumerLifecycle
  implements OnApplicationBootstrap, OnModuleDestroy
{
  constructor(@Optional() private readonly poller?: SqsPoller) {}

  onApplicationBootstrap(): void {
    this.poller?.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.poller?.stop();
  }
}
