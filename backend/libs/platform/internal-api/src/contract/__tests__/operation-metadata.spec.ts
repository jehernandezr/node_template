import { Compensation } from '@contracts/platform';
import { BackoffStrategy } from '@platform/primitives';
import { OperationMetadata } from '../operation-metadata.js';

function metadataOf(
  overrides: Partial<ConstructorParameters<typeof OperationMetadata>[0]> = {},
): OperationMetadata {
  return new OperationMetadata({
    id: 'billing.reserve.v1',
    idempotent: true,
    mutating: true,
    errors: ['BILLING.FUNDS.NOT_ENOUGH'],
    compensatedBy: 'billing.release.v1',
    ...overrides,
  });
}

describe('OperationMetadata', () => {
  describe('retry and time', () => {
    it('uses the defaults when the operation declares nothing', () => {
      const metadata = metadataOf();

      expect(metadata.retryPolicy()).toMatchObject({
        maxAttempts: 3,
        baseMs: 100,
        maxMs: 2000,
        strategy: BackoffStrategy.EqualJitter,
      });
      expect(metadata.attemptTimeoutMs()).toBe(5000);
      expect(metadata.attempts()).toBe(3);
    });

    it('lets the operation override attempts and timeout', () => {
      const metadata = metadataOf({
        retry: { maxAttempts: 5, baseMs: 10, maxMs: 40 },
        timeoutMs: 1000,
      });

      expect(metadata.attempts()).toBe(5);
      expect(metadata.attemptTimeoutMs()).toBe(1000);
      expect(metadata.callBudgetMs()).toBe(5 * 1000 + 4 * 40);
    });

    it('gives a non-idempotent operation exactly one attempt', () => {
      const metadata = metadataOf({ idempotent: false });

      expect(metadata.attempts()).toBe(1);
      expect(metadata.callBudgetMs()).toBe(5000);
    });
  });

  describe('compensation', () => {
    it('returns the id of the compensating operation', () => {
      expect(metadataOf().compensation()).toBe('billing.release.v1');
    });

    it.each([
      ['a read-only operation', { mutating: false, compensatedBy: undefined }],
      [
        'an operation declared with Compensation.None',
        { compensatedBy: Compensation.None, compensationReason: 'Final' },
      ],
    ])('returns null for %s', (_label, overrides) => {
      expect(metadataOf(overrides).compensation()).toBeNull();
    });
  });

  describe('error codes', () => {
    it('allows the declared codes and the invalid-input code', () => {
      expect([...metadataOf().allowedErrorCodes()].sort()).toEqual([
        'BILLING.FUNDS.NOT_ENOUGH',
        OperationMetadata.INVALID_INPUT_CODE,
      ]);
    });
  });

  describe('service', () => {
    it('is the first segment of the operation id', () => {
      expect(metadataOf().service()).toBe('billing');
      expect(OperationMetadata.serviceOf('identity.users.get.v1')).toBe(
        'identity',
      );
    });
  });
});
