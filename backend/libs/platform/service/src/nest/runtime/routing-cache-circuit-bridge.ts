import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  ValkeyCircuit,
  type ValkeyCircuitListener,
} from '@platform/adapters-valkey';
import { ShardRouter } from '@platform/sharding';

/**
 * Keeps routing honest while Valkey is down: the directory change channel runs on Valkey, so while its circuit is
 * open no invalidation reaches this process and every routing lookup reads the directory. When the circuit closes,
 * the routing caches are flushed and used again.
 */
@Injectable()
export class RoutingCacheCircuitBridge
  implements OnModuleInit, OnModuleDestroy, ValkeyCircuitListener
{
  private unsubscribe: () => void = () => undefined;

  constructor(
    private readonly circuit: ValkeyCircuit,
    private readonly router: ShardRouter,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.circuit.subscribe(this);
    if (this.circuit.open) {
      this.opened();
    }
  }

  onModuleDestroy(): void {
    this.unsubscribe();
  }

  /** Valkey stopped answering: routing reads the directory until it is back. */
  opened(): void {
    this.router.suspendCaching();
  }

  /** Valkey answers again: the routing caches are flushed and used again. */
  closed(): void {
    this.router.resumeCaching();
  }
}
