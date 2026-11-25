import {
  ShardKey,
  ShardStrategy,
  ShardingErrorCode,
  type ShardKeyResolver,
} from '@platform/sharding';
import { PersistenceFeature } from '../persistence-feature.js';
import { ProbeEntity } from './utils/probe.entity.js';

const RESOLVER: ShardKeyResolver = {
  resolve: () => 'account-1',
};

/** Builds the declaration inside the promise so its rejection can be read with `rejects`. */
function featureOf(
  init: ConstructorParameters<typeof PersistenceFeature>[0],
): Promise<PersistenceFeature> {
  return Promise.resolve().then(() => new PersistenceFeature(init));
}

describe('PersistenceFeature', () => {
  describe('when the key is Custom without a resolver', () => {
    it('rejects with InvalidConfiguration', async () => {
      await expect(featureOf({ key: ShardKey.Custom })).rejects.toMatchObject({
        code: ShardingErrorCode.InvalidConfiguration,
      });
    });
  });

  describe('when a resolver is given with the Tenant key', () => {
    it('rejects with InvalidConfiguration', async () => {
      await expect(
        featureOf({ key: ShardKey.Tenant, keyResolver: RESOLVER }),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidConfiguration });
    });
  });

  describe('when only the key is given', () => {
    it('defaults to directory strategy and no entities', () => {
      const feature = new PersistenceFeature({ key: ShardKey.Tenant });

      expect(feature.sharding.options.strategy).toBe(ShardStrategy.Directory);
      expect(feature.entities).toEqual([]);
    });

    it('keeps the entities it registers', () => {
      const feature = new PersistenceFeature({
        key: ShardKey.Tenant,
        entities: [ProbeEntity],
      });

      expect(feature.entities).toEqual([ProbeEntity]);
    });
  });
});
