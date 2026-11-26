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
 * Registers Valkey health at startup and closes the connections at shutdown:
 * first the subscriber one and then the command one, both with `quit` so
 * the server finishes what it already received. If `quit` fails, it cuts the connection.
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

  /**
   * It was never used: closing it with `quit` would open a connection just to close it.
   */
  async onModuleDestroy(): Promise<void> {
    await this.subscribers.close();
    if (this.client.status === 'wait') {
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
