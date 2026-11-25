import { PlatformErrorCode } from '@contracts/platform';
import { OptimisticWriter } from '../optimistic-writer.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { StubDataSource } from './utils/stub-data-source.js';
import type { StubQueryRunner } from './utils/stub-query-runner.js';

/** A new `StubQueryRunner` from the test `DataSource`, with its manager. */
async function newRunner(): Promise<StubQueryRunner> {
  const dataSource = new StubDataSource('writer', [ProbeEntity]);
  await dataSource.initialize();
  dataSource.createQueryRunner();
  return dataSource.runners[0];
}

const TENANT = '0193f1c2-0000-7000-8000-0000000000a1';
const ID = '0193f1c2-0000-7000-8000-0000000000c3';

function aProbe(version: number): ProbeEntity {
  const entity = new ProbeEntity();
  entity.id = ID;
  entity.version = version;
  entity.name = 'renamed';
  entity.priority = 4;
  entity.tenantId = TENANT;
  entity.updatedBy = 'actor-1';
  return entity;
}

describe('OptimisticWriter', () => {
  describe('update', () => {
    it('updates the row guarded by id, version, tenant and soft delete', async () => {
      const runner = await newRunner();
      runner.responses.push({ records: [], raw: [], affected: 1 });

      await new OptimisticWriter().update(
        runner.manager,
        ProbeEntity,
        aProbe(2),
        { tenantId: TENANT },
      );

      const update = runner.calls.find((call) =>
        call.startsWith('query UPDATE'),
      );
      expect(update).toContain('UPDATE "probes"');
      expect(update).toContain('"version" = "version" + 1');
      expect(update).toContain('"updated_at" = CURRENT_TIMESTAMP');
      expect(update).toContain('"deleted_at" IS NULL');
      expect(update).toContain('"id" = $');
      expect(update).toContain('"tenant_id" = $');
    });

    it('does not write the version, the creator or the tenant in the SET clause', async () => {
      const runner = await newRunner();
      runner.responses.push({ records: [], raw: [], affected: 1 });

      await new OptimisticWriter().update(
        runner.manager,
        ProbeEntity,
        aProbe(2),
        { tenantId: TENANT },
      );

      const update =
        runner.calls.find((call) => call.startsWith('query UPDATE')) ?? '';
      const setClause = update.slice(
        update.indexOf(' SET '),
        update.indexOf(' WHERE '),
      );
      expect(setClause).toContain('"name" = $');
      expect(setClause).toContain('"priority" = $');
      expect(setClause).not.toContain('"created_by"');
      expect(setClause).not.toContain('"tenant_id"');
      expect(setClause).not.toContain('"version" = $');
    });

    it('throws OptimisticLockError with the expected version when no row matches', async () => {
      const runner = await newRunner();
      runner.responses.push({ records: [], raw: [], affected: 0 });

      const write = new OptimisticWriter().update(
        runner.manager,
        ProbeEntity,
        aProbe(2),
        { tenantId: TENANT },
      );

      await expect(write).rejects.toMatchObject({
        code: PlatformErrorCode.ConflictVersionMismatch,
        details: { table: 'probes', expectedVersion: 2 },
      });
    });
  });
});
