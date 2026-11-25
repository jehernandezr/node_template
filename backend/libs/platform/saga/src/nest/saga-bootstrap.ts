import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { SagaRegistry } from '../definition/saga-registry.js';

/**
 * Seals the registry when the application starts. That way an invalid definition
 * brings down the startup, and not the first saga that uses it.
 */
@Injectable()
export class SagaBootstrap implements OnApplicationBootstrap {
  constructor(private readonly registry: SagaRegistry) {}

  onApplicationBootstrap(): void {
    this.registry.seal();
  }
}
