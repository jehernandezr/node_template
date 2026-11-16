import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import { FixedClock } from '@platform/kernel/test-utils';
import { MigrationGenerator } from '../migration-generator.js';
import { MigrationSourceRenderer } from '../migration-source-renderer.js';

describe('MigrationGenerator', () => {
  const generator = new MigrationGenerator(
    new FixedClock(),
    new MigrationSourceRenderer(),
  );

  describe('when the migration name is not PascalCase', () => {
    it.each(['create', 'Create-Users', ''])(
      'rejects "%s" with INVALID_CONFIG before connecting',
      async (name) => {
        await expect(
          generator.generate({
            name,
            outputDir: '/tmp/unused',
            definition: { entities: [], migrations: [] },
            server: { host: 'localhost', port: 5432 },
            user: 'migrator',
            password: 'unused',
          }),
        ).rejects.toMatchObject({
          code: PersistenceErrorCode.InvalidConfig,
        });
      },
    );
  });
});
