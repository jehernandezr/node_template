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
});
