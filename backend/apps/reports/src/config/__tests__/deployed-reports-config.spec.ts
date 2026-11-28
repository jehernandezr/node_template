import { randomBytes } from 'node:crypto';
import { type ConfigEnv, type DeployEnvironment } from '@platform/config';
import { DeployedServiceEnvironment } from '@platform/config/test-utils';
import { reportsConfigSchema } from '../reports.config.js';

const samples: ConfigEnv = {
  INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
};

const deployed = (environment: DeployEnvironment): ConfigEnv => ({
  ...samples,
  ...DeployedServiceEnvironment.of('reports', environment, samples),
});

describe.each(DeployedServiceEnvironment.ENVIRONMENTS)(
  'reports with its %s values',
  (environment) => {
    it('starts', () => {
      expect(
        reportsConfigSchema.safeParse(deployed(environment)).error,
      ).toBeUndefined();
    });
  },
);
