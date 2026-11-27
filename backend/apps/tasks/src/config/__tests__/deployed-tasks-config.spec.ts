import { randomBytes } from 'node:crypto';
import { type ConfigEnv, type DeployEnvironment } from '@platform/config';
import { DeployedServiceEnvironment } from '@platform/config/test-utils';
import { tasksConfigSchema } from '../tasks.config.js';

const deployed = (environment: DeployEnvironment): ConfigEnv => ({
  INTERNAL_API_SHARED_SECRET: randomBytes(32).toString('base64url'),
  ...DeployedServiceEnvironment.of('tasks', environment),
});

describe.each(DeployedServiceEnvironment.ENVIRONMENTS)(
  'tasks with its %s values',
  (environment) => {
    it('starts', () => {
      expect(
        tasksConfigSchema.safeParse(deployed(environment)).error,
      ).toBeUndefined();
    });
  },
);
