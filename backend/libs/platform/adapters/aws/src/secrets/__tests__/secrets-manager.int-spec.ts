import { SecretInitialization, type SecretReference } from '@platform/config';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { AwsClientFactory } from '../../aws-client-factory.js';
import { LocalStackSecretsServer } from '../../__tests__/utils/localstack-secrets-server.js';
import { SecretsManagerSecretInitializer } from '../secrets-manager-secret-initializer.js';
import { SecretsManagerSecretSource } from '../secrets-manager-secret-source.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('Secrets Manager over LocalStack', () => {
  jest.setTimeout(180_000);
  const server = new LocalStackSecretsServer();

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('SecretsManagerSecretSource', () => {
    it('reads plain secrets and JSON keys of one secret in a single pass', async () => {
      const pepper = await server.create('source/pepper', 'pepper-of-the-test');
      const root = await server.create(
        'source/root',
        JSON.stringify({ email: 'root@example.test', password: 'root-test' }),
      );
      const client = new AwsClientFactory().secretsManager(server.settings());

      const values = await new SecretsManagerSecretSource(client).read([
        { variable: 'EMAIL_PEPPER', secretId: pepper },
        { variable: 'ROOT_EMAIL', secretId: root, jsonKey: 'email' },
        { variable: 'ROOT_PASSWORD', secretId: root, jsonKey: 'password' },
      ]);
      client.destroy();

      expect(Object.fromEntries(values)).toEqual({
        EMAIL_PEPPER: 'pepper-of-the-test',
        ROOT_EMAIL: 'root@example.test',
        ROOT_PASSWORD: 'root-test',
      });
    });

    it('reads more secrets than fit in one batch', async () => {
      const references: SecretReference[] = [];
      for (let index = 0; index < 25; index += 1) {
        references.push({
          variable: `VALUE_${index}`,
          secretId: await server.create(`batch/${index}`, `value-${index}`),
        });
      }

      const values = await new SecretsManagerSecretSource(server.client()).read(
        references,
      );

      expect(values.size).toBe(25);
      expect(values.get('VALUE_24')).toBe('value-24');
    });

    it('names the variables whose secret lacks their JSON key, without any value', async () => {
      const root = await server.create(
        'source/keys',
        JSON.stringify({ email: 'root@example.test' }),
      );

      await expect(
        new SecretsManagerSecretSource(server.client()).read([
          { variable: 'ROOT_PASSWORD', secretId: root, jsonKey: 'password' },
          { variable: 'ROOT_EMAIL', secretId: root, jsonKey: 'email' },
        ]),
      ).rejects.toThrow(
        /^Secrets Manager has no current value for ROOT_PASSWORD$/,
      );
    });

    it('fails for a secret created without a value', async () => {
      const empty = await server.create('source/empty');

      await expect(
        new SecretsManagerSecretSource(server.client()).read([
          { variable: 'SIGNING_KEYS', secretId: empty },
        ]),
      ).rejects.toThrow();
    });
  });

  describe('SecretsManagerSecretInitializer', () => {
    it('fills an empty secret and leaves it unchanged on the next run', async () => {
      const secretId = await server.create('initializer/empty');
      const initializer = new SecretsManagerSecretInitializer(server.client());

      const first = await initializer.initialize(secretId, 'first-value');
      const second = await initializer.initialize(secretId, 'second-value');

      expect([first, second]).toEqual([
        SecretInitialization.Written,
        SecretInitialization.AlreadySet,
      ]);
      expect(await server.current(secretId)).toBe('first-value');
    });

    it('leaves a secret that already has a value unchanged', async () => {
      const secretId = await server.create('initializer/set', 'kept-value');

      const result = await new SecretsManagerSecretInitializer(
        server.client(),
      ).initialize(secretId, 'new-value');

      expect(result).toBe(SecretInitialization.AlreadySet);
      expect(await server.current(secretId)).toBe('kept-value');
    });

    it('fails for a secret that does not exist', async () => {
      await expect(
        new SecretsManagerSecretInitializer(server.client()).initialize(
          'initializer/missing',
          'value',
        ),
      ).rejects.toThrow();
    });
  });
});
