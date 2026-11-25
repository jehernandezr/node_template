import { awsConfigSchema } from '../aws.config.js';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';

describe('awsConfigSchema', () => {
  it('accepts a valid configuration, with or without a LocalStack endpoint', () => {
    expect(awsConfigSchema.parse(AWS_TEST_SETTINGS)).toEqual(AWS_TEST_SETTINGS);
    expect(
      awsConfigSchema.safeParse({
        ...AWS_TEST_SETTINGS,
        AWS_ENDPOINT_URL: 'http://localhost:4566',
      }).success,
    ).toBe(true);
  });

  it.each([
    ['AWS_REGION', 'nowhere'],
    ['AWS_ACCOUNT_ID', '1234'],
    ['MESSAGING_NAME_PREFIX', 'Platform_Local'],
  ])('rejects an invalid %s', (key, value) => {
    expect(
      awsConfigSchema.safeParse({ ...AWS_TEST_SETTINGS, [key]: value }).success,
    ).toBe(false);
  });
});
