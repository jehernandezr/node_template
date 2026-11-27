import { ConfigValidationError, DeployEnvironment } from '@platform/config';
import { RuntimeAdapterSelector } from '../runtime-adapter-selector.js';

describe('RuntimeAdapterSelector', () => {
  describe('select', () => {
    it.each([
      {
        scenario: 'no variable is set',
        env: {},
        overrides: undefined,
        expected: { valkey: false, aws: false },
      },
      {
        scenario: 'VALKEY_URL is set',
        env: { VALKEY_URL: 'redis://localhost:6379' },
        overrides: undefined,
        expected: { valkey: true, aws: false },
      },
      {
        scenario: 'VALKEY_HOST is set',
        env: { VALKEY_HOST: 'valkey.internal' },
        overrides: undefined,
        expected: { valkey: true, aws: false },
      },
      {
        scenario: 'AWS_REGION is set',
        env: { AWS_REGION: 'us-east-1' },
        overrides: undefined,
        expected: { valkey: false, aws: true },
      },
      {
        scenario: 'every variable is blank',
        env: { VALKEY_URL: '', VALKEY_HOST: '  ', AWS_REGION: '' },
        overrides: undefined,
        expected: { valkey: false, aws: false },
      },
      {
        scenario: 'an override turns Valkey off although VALKEY_URL is set',
        env: { VALKEY_URL: 'redis://localhost:6379' },
        overrides: { valkey: false },
        expected: { valkey: false, aws: false },
      },
      {
        scenario: 'an override turns AWS on without AWS_REGION',
        env: {},
        overrides: { aws: true },
        expected: { valkey: false, aws: true },
      },
    ])(
      'deduces the adapters when $scenario',
      ({ env, overrides, expected }) => {
        expect(new RuntimeAdapterSelector().select(env, overrides)).toEqual(
          expected,
        );
      },
    );
  });

  describe('outside local', () => {
    it.each([
      DeployEnvironment.Dev,
      DeployEnvironment.Staging,
      DeployEnvironment.Prod,
    ])(
      'rejects %s without Valkey instead of starting with the null and in-process adapters',
      (environment) => {
        expect(() =>
          new RuntimeAdapterSelector().select({
            DEPLOY_ENVIRONMENT: environment,
          }),
        ).toThrow(ConfigValidationError);
      },
    );

    it('rejects an override that turns Valkey off in a deployed environment', () => {
      expect(() =>
        new RuntimeAdapterSelector().select(
          {
            DEPLOY_ENVIRONMENT: DeployEnvironment.Prod,
            VALKEY_HOST: 'valkey.internal',
          },
          { valkey: false },
        ),
      ).toThrow('VALKEY_HOST');
    });

    it('accepts a deployed environment with VALKEY_HOST', () => {
      expect(
        new RuntimeAdapterSelector().select({
          DEPLOY_ENVIRONMENT: DeployEnvironment.Dev,
          VALKEY_HOST: 'valkey.internal',
        }),
      ).toEqual({ valkey: true, aws: false });
    });

    it('lets local start without Valkey', () => {
      expect(
        new RuntimeAdapterSelector().select({
          DEPLOY_ENVIRONMENT: DeployEnvironment.Local,
        }),
      ).toEqual({ valkey: false, aws: false });
    });
  });
});
