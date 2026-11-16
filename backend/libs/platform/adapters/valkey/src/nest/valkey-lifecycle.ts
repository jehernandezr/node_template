import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { HealthRegistry } from '@platform/observability';
import type { Valkey } from 'iovalkey';
import { ValkeyHealthIndicator } from '../valkey-health-indicator.js';
import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import { VALKEY_CLIENT } from './valkey.tokens.js';

/**
 * Registra la salud de Valkey al iniciar y cierra las conexiones al apagar:
 * primero la del suscriptor y luego la de comandos, ambas con `quit` para que
 * el servidor termine lo que ya recibió. Si `quit` falla, corta la conexión.
 */
@Injectable()
export class ValkeyLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(VALKEY_CLIENT) private readonly client: Valkey,
    private readonly subscribers: ValkeySubscriberSource,
    private readonly health: ValkeyHealthIndicator,
    private readonly registry: HealthRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.health);
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscribers.close();
    if (this.client.status === 'wait') {
      // Nunca se usó: cerrarlo con `quit` abriría una conexión solo para cerrarla.
      this.client.disconnect();
      return;
    }
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
