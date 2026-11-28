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

/** `StubDataSource` whose `initialize` never settles: simulates a database that accepts no connection. */
class HangingStubDataSource extends StubDataSource {
  override initialize(): Promise<this> {
    this.initializeCalls += 1;
    return new Promise<this>(() => undefined);
  }
}

/**
 * Creates a `StubDataSource` per target, with the given entities, and stores what was created. `failNext` makes
 * the next `n` created ones fail on initialization, and
 * `hangFor` makes those of one database never finish it.
 */
export class FakeDataSourceFactory extends DataSourceFactory {
  readonly created: StubDataSource[] = [];
  readonly targets: DatabaseTarget[] = [];
  readonly endpoints: InstanceEndpoints[] = [];
  private failures = 0;
  private readonly hanging = new Set<string>();

  constructor(private readonly entities: readonly EntityClass[] = []) {
    super();
  }

  failNext(count: number): void {
    this.failures = count;
  }

  /**
   * Makes every data source created from now on for `database` never finish its initialization.
   * @param database Logical database that accepts no connection.
   */
  hangFor(database: string): void {
    this.hanging.add(database);
  }

  override create(
    target: DatabaseTarget,
    endpoints: InstanceEndpoints,
  ): DataSource {
    const failing = this.failures > 0;
    if (failing) {
      this.failures -= 1;
    }
    const dataSource = this.hanging.has(target.database)
      ? new HangingStubDataSource(target.database, this.entities)
      : failing
        ? new FailingStubDataSource(target.database, this.entities)
        : new StubDataSource(target.database, this.entities);
    this.created.push(dataSource);
    this.targets.push(target);
    this.endpoints.push(endpoints);
    return dataSource;
  }
}
