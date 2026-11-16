import { Injectable } from '@nestjs/common';
import { Subscribe } from '../../subscribe.decorator.js';
import { UserRegisteredV1 } from './user-registered.contract.js';

/** Consumidor de prueba que guarda los ids recibidos en un campo de instancia. */
@Injectable()
export class RecordingUserConsumer {
  readonly received: string[] = [];

  @Subscribe(UserRegisteredV1)
  handle(data: { userId: string }): void {
    this.received.push(data.userId);
  }
}
