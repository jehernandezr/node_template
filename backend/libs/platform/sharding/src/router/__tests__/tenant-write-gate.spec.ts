import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { TenantStatus } from '../../model/tenant-status.enum.js';
import { TestTenants } from '../../__tests__/utils/index.js';
import { TenantWriteGate } from '../tenant-write-gate.js';
import { AsyncCall } from './utils/async-call.js';

describe('TenantWriteGate', () => {
  describe('assertWritable', () => {
    it('lets an active tenant write', () => {
      expect(() =>
        TenantWriteGate.assertWritable(TestTenants.One, TenantStatus.Active),
      ).not.toThrow();
    });

    it('blocks a migrating tenant with a retryable TenantMigrating error', async () => {
      await expect(
        AsyncCall.run(() =>
          TenantWriteGate.assertWritable(
            TestTenants.One,
            TenantStatus.Migrating,
          ),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.TenantMigrating,
        retryable: true,
        details: { tenantId: TestTenants.One },
      });
    });

    it('refuses an unknown status with TenantNotWritable', async () => {
      await expect(
        AsyncCall.run(() =>
          TenantWriteGate.assertWritable(
            TestTenants.One,
            'frozen' as TenantStatus,
          ),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.TenantNotWritable,
        details: { tenantId: TestTenants.One, status: 'frozen' },
      });
    });
  });
});
