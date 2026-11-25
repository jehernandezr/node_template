import type { MigrationReport, ShardLocation } from '@platform/persistence';
import { MigrationRunnerCall } from './migration-runner-call.enum.js';

/** Call that `FakeMigrationRunner` received, with the shard when there is one. */
export interface RecordedMigrationCall {
  readonly method: MigrationRunnerCall;
  readonly location?: ShardLocation;
}

/**
 * Test migration runner: returns fixed reports and records each call in order. With
 * `failWith`, every call rejects with that error.
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
