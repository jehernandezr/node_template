import type { INestApplicationContext } from '@nestjs/common';
import { DirectoryShardLister } from '@platform/adapters-postgres';
import {
  ShardedMigrationRunner,
  type ShardLister,
} from '@platform/persistence';
import type { FakeMigrationRunner } from './fake-migration-runner.js';

/** Contexto de migración de prueba: resuelve el runner y el listador de shards y cuenta los cierres. */
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
    throw new Error('Token no esperado en FakeMigrationApp');
  }

  close(): Promise<void> {
    this.closeCount += 1;
    return Promise.resolve();
  }

  /** La forma que espera `ServiceMigrator`; el doble solo resuelve los dos tokens que usa. */
  asApplicationContext(): INestApplicationContext {
    return this as unknown as INestApplicationContext;
  }
}
