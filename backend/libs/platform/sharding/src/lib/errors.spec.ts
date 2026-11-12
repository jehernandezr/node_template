import { isErrorCode, PlatformError } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import {
  ShardingError,
  ShardingErrorCode,
  WrongRegionError,
} from './errors.js';

describe('ShardingError', () => {
  it.each(Object.values(ShardingErrorCode))(
    'uses the SERVICE.SUBMODULE.ERROR format for %s',
    (code) => {
      expect(isErrorCode(code)).toBe(true);
    },
  );

  it('extends PlatformError and keeps its code, details and cause', () => {
    const cause = new Error('root');
    const error = new ShardingError(ShardingErrorCode.UnknownTenant, 'msg', {
      details: { tenantId: 't1' },
      cause,
    });
    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ShardingError');
    expect(error.code).toBe(ShardingErrorCode.UnknownTenant);
    expect(error.details).toEqual({ tenantId: 't1' });
    expect(error.cause).toBe(cause);
  });

  it('only marks a migrating tenant as retryable', () => {
    for (const code of Object.values(ShardingErrorCode)) {
      const error = new ShardingError(code, 'msg');
      expect(error.retryable).toBe(code === ShardingErrorCode.TenantMigrating);
    }
  });

  it.each([
    [ShardingErrorCode.TenantMigrating, FailureKind.Transient],
    [ShardingErrorCode.UnknownTenant, FailureKind.Permanent],
    [ShardingErrorCode.InvalidTenantId, FailureKind.Permanent],
    [ShardingErrorCode.KeyMissing, FailureKind.ProtocolViolation],
    [ShardingErrorCode.CrossShardTransaction, FailureKind.ProtocolViolation],
    [ShardingErrorCode.InvalidConfiguration, FailureKind.ProtocolViolation],
  ])('classifies %s as %s', (code, kind) => {
    expect(classifyFailure(new ShardingError(code, 'msg'))).toBe(kind);
  });

  it('WrongRegionError carries the region in a field and in details, not in the message', () => {
    const error = new WrongRegionError('us');
    expect(error).toBeInstanceOf(ShardingError);
    expect(error.name).toBe('WrongRegionError');
    expect(error.code).toBe(ShardingErrorCode.WrongRegion);
    expect(error.region).toBe('us');
    expect(error.details).toEqual({ region: 'us' });
    expect(error.message).not.toContain('us');
    expect(error.retryable).toBe(false);
  });
});
