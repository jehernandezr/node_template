import {
  Injectable,
  Optional,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { SqsPoller } from '../sqs-poller.js';

/**
 * Starts the poller when the application finishes starting and stops it on
 * shutdown, before `AwsModule` closes the clients. Without a poller (`poll:
 * false`) it does nothing.
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
