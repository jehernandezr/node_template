import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';
import { ShardingError } from '../sharding-error.js';
import { ShardingErrorCode } from '../sharding-error-code.enum.js';

describe('ShardingError', () => {
  describe('when classifying each code', () => {
    it.each([
      [ShardingErrorCode.KeyMissing, FailureKind.ProtocolViolation, false],
      [
        ShardingErrorCode.CrossShardTransaction,
        FailureKind.ProtocolViolation,
        false,
      ],
      [ShardingErrorCode.TenantMigrating, FailureKind.Transient, true],
      [ShardingErrorCode.TenantNotWritable, FailureKind.Permanent, false],
      [ShardingErrorCode.UnknownTenant, FailureKind.Permanent, false],
      [ShardingErrorCode.UnknownShard, FailureKind.Permanent, false],
      [ShardingErrorCode.WrongRegion, FailureKind.Permanent, false],
      [ShardingErrorCode.InvalidTenantId, FailureKind.Permanent, false],
      [ShardingErrorCode.InvalidKey, FailureKind.Permanent, false],
      [
        ShardingErrorCode.InvalidConfiguration,
        FailureKind.ProtocolViolation,
        false,
      ],
    ])(
      'gives %s the failure kind %s and retryable %p',
      (code, kind, retryable) => {
        const error = new ShardingError(code, 'msg');
        expect(error.failureKind).toBe(kind);
        expect(error.retryable).toBe(retryable);
      },
    );
  });

  describe('when created with details and a cause', () => {
    it('keeps its code, details and cause', () => {
      const cause = new Error('root');
      const error = new ShardingError(ShardingErrorCode.UnknownTenant, 'msg', {
        details: { tenantId: 't1' },
        cause,
      });
      expect(error).toBeInstanceOf(PlatformError);
      expect(error.name).toBe('ShardingError');
      expect(error.code).toBe(ShardingErrorCode.UnknownTenant);
      expect(error.details).toEqual({ tenantId: 't1' });
      expect(error.cause).toBe(cause);
    });
  });
});
