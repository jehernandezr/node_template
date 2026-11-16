import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { SagaRegistry } from '../definition/saga-registry.js';

/**
 * Sella el registro al arrancar la aplicación. Así una definición inválida
 * tumba el arranque, y no la primera saga que la use.
 */
@Injectable()
export class SagaBootstrap implements OnApplicationBootstrap {
  constructor(private readonly registry: SagaRegistry) {}

  onApplicationBootstrap(): void {
    this.registry.seal();
  }
}
