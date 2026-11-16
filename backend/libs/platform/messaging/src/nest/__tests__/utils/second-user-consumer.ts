import { Injectable } from '@nestjs/common';
import { Subscribe } from '../../subscribe.decorator.js';
import { UserRegisteredV1 } from './user-registered.contract.js';

/** Segundo consumidor del mismo contrato, para probar el conflicto de manejadores. */
@Injectable()
export class SecondUserConsumer {
  @Subscribe(UserRegisteredV1)
  handle(): void {
    // Solo importa el decorador: el conflicto ocurre al registrar.
  }
}
