import type { ShardDataSources, ShardLocation } from '@platform/persistence';
import type { DataSource } from 'typeorm';
import type { FakeDataSource } from './fake-data-source.js';

/** Fuente de shards de prueba: elige el `DataSource` de prueba de cada ubicación y registra las que se piden. */
export class FakeShardDataSources {
  readonly requested: ShardLocation[] = [];

  constructor(
    private readonly dataSourceFor: (location: ShardLocation) => FakeDataSource,
  ) {}

  get(location: ShardLocation): Promise<DataSource> {
    this.requested.push(location);
    return Promise.resolve(this.dataSourceFor(location).asDataSource());
  }

  /** Expone el fake con la forma de `ShardDataSources` que pide `ShardsHealthCheck`. */
  asShardDataSources(): ShardDataSources {
    return this as unknown as ShardDataSources;
  }
}
