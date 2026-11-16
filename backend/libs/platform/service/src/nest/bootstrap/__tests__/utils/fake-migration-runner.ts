import type { MigrationReport, ShardLocation } from '@platform/persistence';
import { MigrationRunnerCall } from './migration-runner-call.enum.js';

/** Llamada que recibió `FakeMigrationRunner`, con el shard cuando la hay. */
export interface RecordedMigrationCall {
  readonly method: MigrationRunnerCall;
  readonly location?: ShardLocation;
}

/**
 * Runner de migraciones de prueba: devuelve reportes fijos y anota cada llamada en orden. Con
 * `failWith`, toda llamada rechaza con ese error.
 */
export class FakeMigrationRunner {
  readonly calls: RecordedMigrationCall[] = [];
  private failure: Error | undefined;

  constructor(
    private readonly catalogReport: MigrationReport,
    private readonly shardReports: readonly MigrationReport[],
  ) {}

  failWith(error: Error): void {
    this.failure = error;
  }

  migrateCatalog(): Promise<MigrationReport> {
    return this.answer(
      { method: MigrationRunnerCall.Catalog },
      () => this.catalogReport,
    );
  }

  migrateShard(location: ShardLocation): Promise<MigrationReport> {
    return this.answer({ method: MigrationRunnerCall.Shard, location }, () =>
      this.shardReportFor(location),
    );
  }

  migrateAll(): Promise<readonly MigrationReport[]> {
    return this.answer({ method: MigrationRunnerCall.All }, () => [
      this.catalogReport,
      ...this.shardReports,
    ]);
  }

  private answer<T>(call: RecordedMigrationCall, result: () => T): Promise<T> {
    this.calls.push(call);
    return this.failure === undefined
      ? Promise.resolve(result())
      : Promise.reject(this.failure);
  }

  private shardReportFor(location: ShardLocation): MigrationReport {
    const report = this.shardReports.find(
      (candidate) => candidate.database === location.logicalShard,
    );
    return report ?? { database: location.logicalShard, applied: [] };
  }
}
