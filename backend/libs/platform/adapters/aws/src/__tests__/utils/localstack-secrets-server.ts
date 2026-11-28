import {
  CreateSecretCommand,
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import type { AwsClientSettings } from '../../aws-client-factory.js';
import { AWS_TEST_SETTINGS } from './aws-test-settings.js';

/**
 * Secrets Manager on a LocalStack container of its own, for the tests that read or write secrets. The SDK takes the
 * LocalStack credentials from the environment variables this server sets while it runs.
 */
export class LocalStackSecretsServer {
  private static readonly IMAGE =
    process.env['LOCALSTACK_IMAGE'] ?? 'localstack/localstack:4';
  private static readonly PORT = 4566;
  private static readonly CREDENTIAL_VARIABLES = {
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
  } as const;

  private container: StartedTestContainer | undefined;
  private sdk: SecretsManagerClient | undefined;
  private readonly runtime = new ContainerRuntime(process.env);

  /** Starts LocalStack with Secrets Manager only and points the SDK credential chain at it. */
  async start(): Promise<void> {
    Object.assign(process.env, LocalStackSecretsServer.CREDENTIAL_VARIABLES);
    this.container = await new GenericContainer(LocalStackSecretsServer.IMAGE)
      .withAutoCleanup(this.runtime.autoCleanup())
      .withEnvironment({ SERVICES: 'secretsmanager' })
      .withExposedPorts(LocalStackSecretsServer.PORT)
      .withWaitStrategy(
        Wait.forHttp(
          '/_localstack/health',
          LocalStackSecretsServer.PORT,
        ).forStatusCode(200),
      )
      .withStartupTimeout(120_000)
      .start();
    this.sdk = new SecretsManagerClient({
      region: this.settings().AWS_REGION,
      endpoint: this.settings().AWS_ENDPOINT_URL,
    });
  }

  /** Stops the container and closes the client. */
  async stop(): Promise<void> {
    this.sdk?.destroy();
    await this.container?.stop();
  }

  /** Region and endpoint of the container, as `AwsClientFactory` takes them. */
  settings(): Required<AwsClientSettings> {
    if (this.container === undefined) {
      throw new Error('LocalStack is not started');
    }
    return {
      AWS_REGION: AWS_TEST_SETTINGS.AWS_REGION,
      AWS_ENDPOINT_URL: `http://${this.container.getHost()}:${this.container.getMappedPort(LocalStackSecretsServer.PORT)}`,
    };
  }

  /** A Secrets Manager client of the container; the server closes it. */
  client(): SecretsManagerClient {
    if (this.sdk === undefined) {
      throw new Error('LocalStack is not started');
    }
    return this.sdk;
  }

  /** Creates a secret, empty when `value` is absent, and returns its ARN. */
  async create(name: string, value?: string): Promise<string> {
    const output = await this.client().send(
      new CreateSecretCommand({
        Name: name,
        ...(value === undefined ? {} : { SecretString: value }),
      }),
    );
    return output.ARN ?? '';
  }

  /** The current value of a secret. */
  async current(secretId: string): Promise<string | undefined> {
    const output = await this.client().send(
      new GetSecretValueCommand({ SecretId: secretId }),
    );
    return output.SecretString;
  }
}
