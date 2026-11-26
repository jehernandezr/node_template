import { ExpressAdapter } from '@nestjs/platform-express';
import { NestServiceApplicationFactory } from '../nest-service-application-factory.js';
import { EmptyHostModule } from './utils/empty-host-module.js';

describe('NestServiceApplicationFactory', () => {
  const factory = new NestServiceApplicationFactory();
  const options = { logger: false as const, abortOnError: false };

  it('creates an HTTP application with the default adapter', async () => {
    const app = await factory.http(
      { module: EmptyHostModule },
      undefined,
      options,
    );

    expect(app.getHttpAdapter()).toBeInstanceOf(ExpressAdapter);
    await app.close();
  });

  it('creates the HTTP application over the adapter it is given', async () => {
    const adapter = new ExpressAdapter();

    const app = await factory.http(
      { module: EmptyHostModule },
      adapter,
      options,
    );

    expect(app.getHttpAdapter()).toBe(adapter);
    await app.close();
  });

  it('creates a worker context that resolves the providers of its module', async () => {
    const context = await factory.worker({ module: EmptyHostModule }, options);

    expect(context.get(EmptyHostModule)).toBeInstanceOf(EmptyHostModule);
    await context.close();
  });
});
