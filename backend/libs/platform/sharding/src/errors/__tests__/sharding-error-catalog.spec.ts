import { ErrorAudience } from '@contracts/platform';
import { shardingErrorCatalog } from '../sharding-error-catalog.js';
import { ShardingErrorCode } from '../sharding-error-code.enum.js';

describe('shardingErrorCatalog', () => {
  describe('when it is read', () => {
    const codes = shardingErrorCatalog.map((entry) => entry.code);

    it.each(Object.values(ShardingErrorCode))('has an entry for %s', (code) => {
      expect(codes).toContain(code);
    });

    it('has exactly one entry per code', () => {
      expect(codes).toHaveLength(Object.values(ShardingErrorCode).length);
    });
  });

  describe('when the audience is read', () => {
    it('exposes only the codes the client can see', () => {
      const publicCodes = shardingErrorCatalog
        .filter((entry) => entry.audience === ErrorAudience.Public)
        .map((entry) => entry.code);
      expect([...publicCodes].sort()).toEqual(
        [
          ShardingErrorCode.KeyMissing,
          ShardingErrorCode.CrossShardTransaction,
          ShardingErrorCode.TenantMigrating,
          ShardingErrorCode.TenantNotWritable,
        ].sort(),
      );
    });
  });
});
