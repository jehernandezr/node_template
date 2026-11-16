import { PlatformErrorCode } from '@contracts/platform';
import { ConfigInstanceEndpointResolver } from '../config-instance-endpoint-resolver.js';

const INSTANCES = {
  'db-1': {
    primary: { host: '10.0.0.1', port: 5432 },
    replicas: [{ host: '10.0.0.2', port: 5433 }],
  },
};

describe('ConfigInstanceEndpointResolver', () => {
  describe('when the instance is configured', () => {
    it('returns its primary and replicas', () => {
      const resolver = new ConfigInstanceEndpointResolver(INSTANCES);

      expect(resolver.resolve('db-1')).toEqual(INSTANCES['db-1']);
    });
  });

  describe('when the instance is not configured', () => {
    it.each(['db-2', 'constructor', '__proto__'])(
      'rejects %s with INVALID_CONFIG',
      async (instance) => {
        const resolver = new ConfigInstanceEndpointResolver(INSTANCES);

        await expect(
          Promise.resolve().then(() => resolver.resolve(instance)),
        ).rejects.toMatchObject({
          code: PlatformErrorCode.PersistenceInvalidConfig,
        });
      },
    );
  });
});
