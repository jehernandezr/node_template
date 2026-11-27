import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SystemClock } from '@platform/kernel';
import {
  ContainerRuntime,
  SharedTestServers,
  type SharedPostgres,
} from '@platform/kernel/test-utils';
import { MigrationGenerator } from '../migration-generator.js';
import type { MigrationGenerateRequest } from '../model/migration-generate-request.js';
import type { DatabaseSetDefinition } from '../model/database-set-definition.js';
import { MigrationSourceRenderer } from '../migration-source-renderer.js';
import { PlatformPersistenceMigrations } from '../migrations/platform-persistence-migrations.js';
import { ProbeDatabaseSets } from './utils/probe-database-sets.js';
import { ProbeEntity } from './utils/probe.entity.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('MigrationGenerator against PostgreSQL', () => {
  let server: SharedPostgres;
  let outputDir: string;
  let generator: MigrationGenerator;

  beforeAll(async () => {
    server = new SharedTestServers(process.env).postgres();
    outputDir = await mkdtemp(join(tmpdir(), 'migration-'));
    generator = new MigrationGenerator(
      new SystemClock(),
      new MigrationSourceRenderer(),
    );
  });

  afterAll(async () => {
    await rm(outputDir, { recursive: true, force: true });
  });

  function requestFor(
    definition: DatabaseSetDefinition,
  ): MigrationGenerateRequest {
    return {
      name: 'CreateProbes',
      outputDir,
      definition,
      server: {
        host: server.host,
        port: server.port,
      },
      user: server.username,
      password: server.password,
    };
  }

  it('writes a migration that creates the table of an entity without migrations', async () => {
    const path = await generator.generate(
      requestFor({
        entities: [ProbeEntity],
        migrations: [...PlatformPersistenceMigrations.shard],
      }),
    );

    const source = await readFile(path ?? '', 'utf8');

    expect(source).toContain('CREATE TABLE "probes"');
    expect(source).toContain('implements MigrationInterface');
  });

  it('returns null when the migrations already cover the entities', async () => {
    const path = await generator.generate(requestFor(ProbeDatabaseSets.shard));

    expect(path).toBeNull();
  });
});
