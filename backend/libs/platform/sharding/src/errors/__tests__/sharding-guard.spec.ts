import { ShardingErrorCode } from '../sharding-error-code.enum.js';
import { ShardingGuard } from '../sharding-guard.js';

describe('ShardingGuard', () => {
  describe('when an option is not positive', () => {
    it('throws an invalid configuration error naming the option', () => {
      expect(() => ShardingGuard.instance.positiveInteger('x', 0)).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option: 'x' },
        }),
      );
    });

    it('rejects a promise with the same error when used asynchronously', async () => {
      await expect(
        Promise.resolve().then(() =>
          ShardingGuard.instance.positiveInteger('x', 0),
        ),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.InvalidConfiguration,
        details: { option: 'x' },
      });
    });
  });
});
