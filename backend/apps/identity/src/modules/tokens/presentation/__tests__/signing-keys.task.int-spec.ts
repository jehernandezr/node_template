import { AwsClientFactory } from '@platform/adapters-aws';
import { LocalStackSecretsServer } from '@platform/adapters-aws/test-utils';
import { SecretInitialization } from '@platform/config';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ConfigSigningKeyProvider } from '../../infrastructure/config-signing-key-provider.js';
import { SigningKeysTask } from '../signing-keys.task.js';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('signing-keys task', () => {
  jest.setTimeout(180_000);
  const server = new LocalStackSecretsServer();
  const task = new SigningKeysTask(new AwsClientFactory());

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  const environmentFor = (secretId: string) => ({
    ...server.settings(),
    IDENTITY_SIGNING_KEYS_SECRET_ARN: secretId,
  });

  it('fills the empty container with a key set identity can sign with', async () => {
    const secretId = await server.create('identity/signing-keys-empty');

    const result = await task.run(environmentFor(secretId));

    expect(result).toBe(SecretInitialization.Written);
    const keys = new ConfigSigningKeyProvider(
      (await server.current(secretId)) ?? '',
    ).ring();
    expect(keys.published()).toHaveLength(1);
  });

  it('leaves a filled container unchanged on every later run', async () => {
    const secretId = await server.create('identity/signing-keys-filled');
    await task.run(environmentFor(secretId));
    const first = await server.current(secretId);

    const result = await task.run(environmentFor(secretId));

    expect(result).toBe(SecretInitialization.AlreadySet);
    expect(await server.current(secretId)).toBe(first);
  });
});
