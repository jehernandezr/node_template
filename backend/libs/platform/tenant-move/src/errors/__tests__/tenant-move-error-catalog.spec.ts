import { ErrorAudience } from '@contracts/platform';
import { tenantMoveErrorCatalog } from '../tenant-move-error-catalog.js';
import { TenantMoveErrorCode } from '../tenant-move-error-code.enum.js';
import { TenantMoveError } from '../tenant-move.error.js';

describe('tenantMoveErrorCatalog', () => {
  it('describes every code of the library, none of them for the client', () => {
    expect(tenantMoveErrorCatalog.map((entry) => entry.code).sort()).toEqual(
      Object.values(TenantMoveErrorCode).sort(),
    );
    for (const entry of tenantMoveErrorCatalog) {
      expect(entry.audience).toBe(ErrorAudience.Internal);
    }
  });

  it('lets the saga retry only a round that did not finish', () => {
    expect(
      Object.values(TenantMoveErrorCode).filter(
        (code) => new TenantMoveError(code, 'x').retryable,
      ),
    ).toEqual([TenantMoveErrorCode.RoundPending]);
  });
});
