import { join } from 'node:path';
import { FixedClock } from '@platform/kernel/test-utils';
import type { MigrationGenerateRequest } from '../../model/migration-generate-request.js';
import { MigrationGenerator } from '../../migration-generator.js';
import { MigrationSourceRenderer } from '../../migration-source-renderer.js';
import { MigrationGenerateCommand } from '../migration-generate-command.js';

const PROBE_DEFINITION = join(
  __dirname,
  '../../__tests__/utils/probe-definition.ts',
);
const NOT_A_DEFINITION = join(
  __dirname,
  '../../__tests__/utils/static-shard-lister.ts',
);
const CREDENTIALS = {
  MIGRATION_DB_USER: 'migrator',
  MIGRATION_DB_PASSWORD: 'migrator-secret',
};

/** Test double generator: records each request and responds with the given result. */
class RecordingGenerator extends MigrationGenerator {
  readonly requests: MigrationGenerateRequest[] = [];

  constructor(private readonly outcome: () => Promise<string | null>) {
    super(new FixedClock(), new MigrationSourceRenderer());
  }

  override generate(request: MigrationGenerateRequest): Promise<string | null> {
    this.requests.push(request);
    return this.outcome();
  }
}

function argsFor(definition: string): string[] {
  return [
    '--name=CreateProbes',
    `--definition=${definition}`,
    '--out=/tmp/migrations',
  ];
}

function commandWith(
  generator: RecordingGenerator,
  env: Record<string, string | undefined> = CREDENTIALS,
): { command: MigrationGenerateCommand; lines: string[] } {
  const lines: string[] = [];
  return {
    command: new MigrationGenerateCommand(generator, env, (text) =>
      lines.push(text),
    ),
    lines,
  };
}

describe('MigrationGenerateCommand', () => {
  describe('when an argument is missing', () => {
    it('prints the usage and exits with 2 without generating', async () => {
      const generator = new RecordingGenerator(() => Promise.resolve(null));
      const { command, lines } = commandWith(generator);

      const code = await command.run([
        '--name=CreateProbes',
        `--definition=${PROBE_DEFINITION}`,
      ]);

      expect(code).toBe(2);
      expect(lines).toEqual([
        expect.stringContaining('Uso: migration-generate'),
      ]);
      expect(generator.requests).toEqual([]);
    });
  });

  describe('when an unknown argument is given', () => {
    it('exits with 2', async () => {
      const generator = new RecordingGenerator(() => Promise.resolve(null));
      const { command } = commandWith(generator);

      const code = await command.run([...argsFor(PROBE_DEFINITION), '--force']);

      expect(code).toBe(2);
    });
  });

  describe('when the credentials are missing', () => {
    it('exits with 2 without generating', async () => {
      const generator = new RecordingGenerator(() => Promise.resolve(null));
      const { command } = commandWith(generator, {});

      const code = await command.run(argsFor(PROBE_DEFINITION));

      expect(code).toBe(2);
      expect(generator.requests).toEqual([]);
    });
  });

  describe('when the definition module has no DatabaseSetDefinition default export', () => {
    it('exits with 2 and says so', async () => {
      const generator = new RecordingGenerator(() => Promise.resolve(null));
      const { command, lines } = commandWith(generator);

      const code = await command.run(argsFor(NOT_A_DEFINITION));

      expect(code).toBe(2);
      expect(lines).toEqual([
        'La definicion no exporta por defecto un DatabaseSetDefinition',
      ]);
    });
  });

  describe('when the generator writes a migration', () => {
    it('prints its path, exits with 0 and passes the connection from the environment', async () => {
      const generator = new RecordingGenerator(() =>
        Promise.resolve('/tmp/migrations/1794700000001-CreateProbes.ts'),
      );
      const { command, lines } = commandWith(generator, {
        ...CREDENTIALS,
        MIGRATION_DB_HOST: 'db.local',
        MIGRATION_DB_PORT: '6543',
      });

      const code = await command.run(argsFor(PROBE_DEFINITION));

      expect(code).toBe(0);
      expect(lines).toEqual([
        'Migracion generada: /tmp/migrations/1794700000001-CreateProbes.ts',
      ]);
      expect(generator.requests[0]).toMatchObject({
        name: 'CreateProbes',
        outputDir: '/tmp/migrations',
        server: { host: 'db.local', port: 6543 },
        user: 'migrator',
        password: 'migrator-secret',
      });
    });
  });

  describe('when the entities already match the migrations', () => {
    it('says there are no changes and exits with 0', async () => {
      const generator = new RecordingGenerator(() => Promise.resolve(null));
      const { command, lines } = commandWith(generator);

      const code = await command.run(argsFor(PROBE_DEFINITION));

      expect(code).toBe(0);
      expect(lines).toEqual([
        'Sin cambios: las entidades coinciden con las migraciones',
      ]);
    });
  });

  describe('when the generator fails', () => {
    it('prints the error and exits with 1', async () => {
      const generator = new RecordingGenerator(() =>
        Promise.reject(new Error('db is down')),
      );
      const { command, lines } = commandWith(generator);

      const code = await command.run(argsFor(PROBE_DEFINITION));

      expect(code).toBe(1);
      expect(lines).toEqual(['Error: db is down']);
    });
  });
});
