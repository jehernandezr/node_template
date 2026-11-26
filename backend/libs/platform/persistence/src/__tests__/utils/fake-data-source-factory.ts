import type { DataSource } from 'typeorm';
import type { DatabaseTarget } from '../../model/database-target.js';
import type { InstanceEndpoints } from '../../model/instance-endpoints.js';
import { DataSourceFactory } from '../../ports/data-source-factory.js';
import type { EntityClass } from '../../metadata/entity-metadata.js';
import { StubDataSource } from './stub-data-source.js';

/** `StubDataSource` whose `initialize` rejects: simulates a database that is down on first use. */
class FailingStubDataSource extends StubDataSource {
  override async initialize(): Promise<this> {
    this.initializeCalls += 1;
    throw new Error('initialize failed');
  }
}

/**
 * Creates a `StubDataSource` per target, with the given entities, and stores what was created. `failNext` makes
 * the next `n` created ones fail on initialization.
 */
export class FakeDataSourceFactory extends DataSourceFactory {
  readonly created: StubDataSource[] = [];
  readonly targets: DatabaseTarget[] = [];
  readonly endpoints: InstanceEndpoints[] = [];
  private failures = 0;

  constructor(private readonly entities: readonly EntityClass[] = []) {
    super();
  }

  failNext(count: number): void {
    this.failures = count;
  }

  override create(
    target: DatabaseTarget,
    endpoints: InstanceEndpoints,
  ): DataSource {
    const failing = this.failures > 0;
    if (failing) {
      this.failures -= 1;
    }
    const dataSource = failing
      ? new FailingStubDataSource(target.database, this.entities)
      : new StubDataSource(target.database, this.entities);
    this.created.push(dataSource);
    this.targets.push(target);
    this.endpoints.push(endpoints);
    return dataSource;
  }
}
