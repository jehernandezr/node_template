import type { INestApplicationContext } from '@nestjs/common';
import { DirectoryShardLister } from '@platform/adapters-postgres';
import {
  ShardedMigrationRunner,
  type ShardLister,
} from '@platform/persistence';
import type { FakeMigrationRunner } from './fake-migration-runner.js';

/** Test migration context: resolves the runner and the shard lister and counts the closes. */
export class FakeMigrationApp {
  closeCount = 0;

  constructor(
    private readonly runner: FakeMigrationRunner,
    private readonly lister: ShardLister,
  ) {}

  get(token: unknown): unknown {
    if (token === ShardedMigrationRunner) {
      return this.runner;
    }
    if (token === DirectoryShardLister) {
      return this.lister;
    }
    throw new Error('Unexpected token in FakeMigrationApp');
  }

  close(): Promise<void> {
    this.closeCount += 1;
    return Promise.resolve();
  }

  /** The shape `ServiceMigrator` expects; the double only resolves the two tokens it uses. */
  asApplicationContext(): INestApplicationContext {
    return this as unknown as INestApplicationContext;
  }
}
