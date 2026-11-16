import type { ShardDirectoryChangeSubscriber } from './ports/shard-directory-change-subscriber.js';
import type { ShardRouter } from './shard-router.js';

/**
 * Mantiene la suscripción de un `ShardRouter` al canal de cambios del
 * directorio: `start` la abre y `stop` la cierra. Ambas son idempotentes.
 */
export class DirectoryChangeSubscription {
  private unsubscribe: (() => Promise<void>) | undefined;

  constructor(
    private readonly router: ShardRouter,
    private readonly subscriber: ShardDirectoryChangeSubscriber,
  ) {}

  /** Abre la suscripción. No hace nada si ya está abierta. */
  async start(): Promise<void> {
    if (this.unsubscribe !== undefined) {
      return;
    }
    this.unsubscribe = await this.router.listen(this.subscriber);
  }

  /** Cierra la suscripción. No hace nada si no está abierta. */
  async stop(): Promise<void> {
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = undefined;
    await unsubscribe?.();
  }
}
