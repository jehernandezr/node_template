import type { Clock } from '@platform/kernel';
import type { DataSource } from 'typeorm';
import { PersistenceErrorCode } from './errors/persistence-error-code.enum.js';
import { PersistenceError } from './errors/persistence-error.js';
import { DatabaseKind } from './model/database-kind.enum.js';
import type { ShardDataSourcesOptions } from './model/shard-data-sources-options.js';
import type { ShardLocation } from './model/shard-location.js';
import type { DataSourceFactory } from './ports/data-source-factory.js';
import type { InstanceEndpointResolver } from './ports/instance-endpoint-resolver.js';

/** Un shard lógico con su `DataSource`, su instancia y el instante de su último uso. */
interface Entry {
  readonly instance: string;
  readonly dataSource: DataSource;
  /** Se comparte entre las llamadas concurrentes: todas esperan la misma inicialización. */
  readonly ready: Promise<DataSource>;
  lastUsedMs: number;
}

/**
 * Un `DataSource` de TypeORM por shard lógico. Los crea al primer uso, cierra los que no se usan
 * y cierra el viejo cuando un shard cambia de instancia.
 */
export class ShardDataSources {
  private readonly entries = new Map<string, Entry>();
  private shutDown = false;

  constructor(
    private readonly factory: DataSourceFactory,
    private readonly endpoints: InstanceEndpointResolver,
    private readonly clock: Clock,
    private readonly options: ShardDataSourcesOptions,
  ) {}

  /**
   * `DataSource` inicializado del shard.
   * @throws PersistenceError `ShuttingDown` si ya se cerraron: un job que sigue corriendo durante el apagado
   * abriría un pool que nadie cierra.
   */
  async get(location: ShardLocation): Promise<DataSource> {
    this.assertOpen();
    const now = this.clock.now().getTime();
    const existing = this.entries.get(location.logicalShard);
    if (existing !== undefined && existing.instance === location.instance) {
      existing.lastUsedMs = now;
      return existing.ready;
    }
    if (existing !== undefined) {
      this.entries.delete(location.logicalShard);
      await this.dispose(existing);
      this.assertOpen();
    }

    const resolved = this.endpoints.resolve(location.instance);
    const dataSource = this.factory.create(
      {
        kind: DatabaseKind.Shard,
        instance: location.instance,
        database: location.logicalShard,
      },
      resolved,
    );
    const ready = dataSource.initialize();
    this.entries.set(location.logicalShard, {
      instance: location.instance,
      dataSource,
      ready,
      lastUsedMs: now,
    });
    try {
      await ready;
    } catch (error) {
      // Sin esto, el siguiente pedido recibiría la inicialización fallida en lugar de reintentarla.
      if (this.entries.get(location.logicalShard)?.ready === ready) {
        this.entries.delete(location.logicalShard);
      }
      throw error;
    }
    await this.closeIdle();
    return dataSource;
  }

  /** Cierra los `DataSource` sin uso desde hace más de `idleTtlMs`. Devuelve cuántos cerró. */
  async closeIdle(): Promise<number> {
    const now = this.clock.now().getTime();
    const idle = [...this.entries].filter(
      ([, entry]) => now - entry.lastUsedMs > this.options.idleTtlMs,
    );
    for (const [logicalShard] of idle) {
      this.entries.delete(logicalShard);
    }
    await Promise.all(idle.map(([, entry]) => this.dispose(entry)));
    return idle.length;
  }

  /** Ids de los shards con un `DataSource` abierto. */
  activeShards(): readonly string[] {
    return [...this.entries.keys()];
  }

  /** Cierra todos. Se llama al apagar el proceso. */
  async close(): Promise<void> {
    this.shutDown = true;
    const all = [...this.entries.values()];
    this.entries.clear();
    await Promise.all(all.map((entry) => this.dispose(entry)));
  }

  private assertOpen(): void {
    if (this.shutDown) {
      throw new PersistenceError(
        PersistenceErrorCode.ShuttingDown,
        'Shard data sources are closed',
      );
    }
  }

  private async dispose(entry: Entry): Promise<void> {
    try {
      const dataSource = await entry.ready;
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
    } catch {
      // Si la inicialización nunca terminó no hay nada que cerrar.
    }
  }
}
