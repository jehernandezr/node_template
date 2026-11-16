import { PlatformErrorCode } from '@contracts/platform';
import { PlacementBuilder } from '@platform/sharding/test-utils';
import { PlacementValidator } from '../stores/placement.validator.js';

describe('PlacementValidator', () => {
  describe('when the placement is valid', () => {
    it('accepts it without throwing', () => {
      const placement = PlacementBuilder.aPlacement().build();

      expect(() => PlacementValidator.assert(placement)).not.toThrow();
    });
  });

  describe('when one field is invalid', () => {
    it.each([
      [
        'an empty tenant id',
        { tenantId: '' },
        'placement.tenantId must be a non-empty string',
      ],
      [
        'an empty region',
        { region: '' },
        'placement.region must be a non-empty string',
      ],
      [
        'an empty shard group',
        { shardGroup: [] },
        'placement.shardGroup must be a non-empty list of shard ids',
      ],
      [
        'a shard id that is empty',
        { shardGroup: [''] },
        'placement.shardGroup must be a non-empty list of shard ids',
      ],
      [
        'a status that is not a TenantStatus',
        { status: 'paused' as never },
        'placement.status must be a TenantStatus',
      ],
      [
        'a negative version',
        { version: -1 },
        'placement.version must be a non-negative integer',
      ],
      [
        'a version that is not an integer',
        { version: 2.5 },
        'placement.version must be a non-negative integer',
      ],
      [
        'a dedicated flag that is not a boolean',
        { dedicated: 'no' as never },
        'placement.dedicated must be a boolean',
      ],
    ])('rejects %s', (_name, override, message) => {
      const placement = {
        ...PlacementBuilder.aPlacement().build(),
        ...override,
      };

      expect(() => PlacementValidator.assert(placement)).toThrow(
        expect.objectContaining({
          code: PlatformErrorCode.PersistenceInvalidConfig,
          message,
        }),
      );
    });
  });
});
