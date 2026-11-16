import { Injectable, type OnModuleInit } from '@nestjs/common';
import { HealthRegistry } from '@platform/observability';
import { CatalogHealthCheck } from './catalog-health-check.js';
import { ShardsHealthCheck } from './shards-health-check.js';

/** Registra en `HealthRegistry` los checks de las bases al iniciar el módulo. */
@Injectable()
export class HealthRegistrar implements OnModuleInit {
  constructor(
    private readonly registry: HealthRegistry,
    private readonly catalog: CatalogHealthCheck,
    private readonly shards: ShardsHealthCheck,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.catalog);
    this.registry.register(this.shards);
  }
}
