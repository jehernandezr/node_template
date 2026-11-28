import { ConfigValidationError } from '../../errors/config-validation.error.js';
import { SecretsMap } from '../secrets-map.js';

const ARN =
  'arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/identity/data-key-AbCdEf';

describe('SecretsMap', () => {
  const issuesOf = (raw: string): readonly string[] => {
    try {
      SecretsMap.parse(raw);
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        return error.issues.map((issue) => issue.path);
      }
      throw error;
    }
    return [];
  };

  it('reads each variable with its secret and, when given, its JSON key', () => {
    const map = SecretsMap.parse(
      JSON.stringify({
        IDENTITY_DATA_KEY: ARN,
        ZO_ROOT_USER_EMAIL: `${ARN}:email::`,
        ZO_ROOT_USER_PASSWORD: `${ARN}:password`,
      }),
    );

    expect(map.references).toEqual([
      { variable: 'IDENTITY_DATA_KEY', secretId: ARN },
      { variable: 'ZO_ROOT_USER_EMAIL', secretId: ARN, jsonKey: 'email' },
      { variable: 'ZO_ROOT_USER_PASSWORD', secretId: ARN, jsonKey: 'password' },
    ]);
  });

  it('rejects text that is not a JSON object', () => {
    expect(issuesOf('not json')).toEqual(['SECRETS_MAP']);
    expect(issuesOf('[]')).toEqual(['SECRETS_MAP']);
  });

  it('rejects a value that is not a Secrets Manager ARN and names the variable', () => {
    expect(
      issuesOf(JSON.stringify({ IDENTITY_DATA_KEY: 'plain-text-value' })),
    ).toEqual(['SECRETS_MAP.IDENTITY_DATA_KEY']);
  });

  it('rejects a version stage, so the value is always the current one', () => {
    expect(
      issuesOf(
        JSON.stringify({ IDENTITY_DATA_KEY: `${ARN}:key:AWSPREVIOUS:` }),
      ),
    ).toEqual(['SECRETS_MAP.IDENTITY_DATA_KEY']);
  });

  it('rejects a name that is not an environment variable', () => {
    expect(issuesOf(JSON.stringify({ 'data key': ARN }))).toEqual([
      'SECRETS_MAP.data key',
    ]);
  });
});
