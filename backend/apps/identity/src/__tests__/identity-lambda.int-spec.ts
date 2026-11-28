import { SecretsManagerSecretSource } from '@platform/adapters-aws';
import { LocalStackSecretsServer } from '@platform/adapters-aws/test-utils';
import type { ConfigEnv } from '@platform/config';
import { HttpApplicationSetup } from '@platform/http/nest';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { LambdaBootstrap } from '@platform/service/nest';
import {
  ApiGatewayEventBuilder,
  ClosingApplicationFactory,
} from '@platform/service/test-utils';
import { identityService } from '../identity.service.js';
import { IdentityTestApp } from './utils/index.js';

const runtime = new ContainerRuntime(process.env);

const SECRET_VARIABLES = [
  'IDENTITY_SIGNING_KEYS',
  'IDENTITY_EMAIL_PEPPER',
  'IDENTITY_TOKEN_PEPPER',
  'IDENTITY_API_KEY_PEPPER',
  'IDENTITY_DEVICE_ID_KEY',
  'IDENTITY_DATA_KEY',
  'INTERNAL_API_SHARED_SECRET',
] as const;

runtime.describeIfAvailable('identity on Lambda', () => {
  jest.setTimeout(240_000);

  const app = new IdentityTestApp();
  const secrets = new LocalStackSecretsServer();
  const applications = new ClosingApplicationFactory();

  beforeAll(async () => {
    await app.start();
    await secrets.start();
  });

  afterAll(async () => {
    await applications.closeAll();
    await secrets.stop();
    await app.stop();
  });

  const lambdaEnvironment = async (): Promise<ConfigEnv> => {
    const env: Record<string, string | undefined> = { ...app.env() };
    const map: Record<string, string> = {};
    for (const variable of SECRET_VARIABLES) {
      map[variable] = await secrets.create(
        `identity/${variable.toLowerCase()}`,
        String(env[variable]),
      );
      delete env[variable];
    }
    return { ...env, SECRETS_MAP: JSON.stringify(map) };
  };

  it('starts from SECRETS_MAP and signs with the keys of its secret', async () => {
    const signingKeys = JSON.parse(
      String(app.env()['IDENTITY_SIGNING_KEYS']),
    ) as readonly { readonly kid: string }[];
    const handler = LambdaBootstrap.http(identityService, {
      env: await lambdaEnvironment(),
      applications,
      secrets: new SecretsManagerSecretSource(secrets.client()),
      http: { configurer: new HttpApplicationSetup() },
    });

    const response = await handler(
      ApiGatewayEventBuilder.aRequest('GET', '/v1/auth/jwks').build(),
    );

    expect(response.statusCode).toBe(200);
    expect(
      (JSON.parse(response.body) as { keys: { kid: string }[] }).keys.map(
        (key) => key.kid,
      ),
    ).toEqual(signingKeys.map((key) => key.kid));
  });
});
