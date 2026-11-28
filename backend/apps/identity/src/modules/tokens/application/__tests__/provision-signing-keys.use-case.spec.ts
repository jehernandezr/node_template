import { SecretInitialization } from '@platform/config';
import { InMemorySecretInitializer } from '@platform/config/test-utils';
import { FixedSigningKeySetGenerator } from '../../__tests__/utils/fixed-signing-key-set-generator.js';
import { ProvisionSigningKeys } from '../provision-signing-keys.use-case.js';

const SECRET_ID =
  'arn:aws:secretsmanager:us-east-1:123456789012:secret:nt-dev/identity/signing-keys-AbCdEf';

describe('ProvisionSigningKeys', () => {
  it('writes a key set to an empty secret', async () => {
    const secrets = new InMemorySecretInitializer();

    const result = await new ProvisionSigningKeys(
      secrets,
      new FixedSigningKeySetGenerator('[{"kid":"new-key"}]'),
    ).execute(SECRET_ID);

    expect(result).toBe(SecretInitialization.Written);
    expect(secrets.stored(SECRET_ID)).toBe('[{"kid":"new-key"}]');
  });

  it('leaves the keys of a filled secret as they are', async () => {
    const secrets = new InMemorySecretInitializer({
      [SECRET_ID]: 'keys-already-in-use',
    });

    const result = await new ProvisionSigningKeys(
      secrets,
      new FixedSigningKeySetGenerator('[{"kid":"new-key"}]'),
    ).execute(SECRET_ID);

    expect(result).toBe(SecretInitialization.AlreadySet);
    expect(secrets.stored(SECRET_ID)).toBe('keys-already-in-use');
  });
});
