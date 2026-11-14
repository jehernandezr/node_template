import { ShardingError } from '../sharding-error.js';
import { ShardingErrorCode } from '../sharding-error-code.enum.js';
import { WrongRegionError } from '../wrong-region.error.js';

describe('WrongRegionError', () => {
  describe('when created for a region', () => {
    it('exposes the code and the region', () => {
      const error = new WrongRegionError('us');
      expect(error).toBeInstanceOf(ShardingError);
      expect(error.code).toBe(ShardingErrorCode.WrongRegion);
      expect(error.region).toBe('us');
    });

    it('carries the region in details but not in the message', () => {
      const error = new WrongRegionError('us');
      expect(error.details).toEqual({ region: 'us' });
      expect(error.message).not.toContain('us');
    });
  });
});
