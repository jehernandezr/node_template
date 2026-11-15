import { DataSource, type QueryRunner, type ReplicationMode } from 'typeorm';
import { StubQueryRunner } from './stub-query-runner.js';

/**
 * `DataSource` sin base de datos: `initialize` y `destroy` solo cambian el estado y
 * `createQueryRunner` entrega un `StubQueryRunner` que se guarda en `runners`.
 */
export class StubDataSource extends DataSource {
  readonly runners: StubQueryRunner[] = [];
  initializeCalls = 0;
  destroyCalls = 0;

  constructor(
    readonly label: string,
    entities: readonly (abstract new (...args: never[]) => object)[] = [],
  ) {
    super({ type: 'postgres', database: label, entities: [...entities] });
  }

  /** Marca el `DataSource` como inicializado y construye la metadata de sus entidades. */
  override async initialize(): Promise<this> {
    this.initializeCalls += 1;
    await this.buildMetadatas();
    Object.assign(this, { isInitialized: true });
    return this;
  }

  override destroy(): Promise<void> {
    this.destroyCalls += 1;
    Object.assign(this, { isInitialized: false });
    return Promise.resolve();
  }

  override createQueryRunner(mode: ReplicationMode = 'master'): QueryRunner {
    const runner = new StubQueryRunner(this, mode);
    this.runners.push(runner);
    return runner;
  }
}
