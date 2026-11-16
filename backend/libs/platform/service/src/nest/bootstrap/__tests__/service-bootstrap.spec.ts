import { NestFactory } from '@nestjs/core';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { InvalidServiceDefinitionError } from '../../../errors/invalid-service-definition.error.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/service-definition.builder.js';
import { ServiceHostModule } from '../../runtime/service-host.module.js';
import { ServiceBootstrap } from '../service-bootstrap.js';
import { BootstrapStep } from './utils/bootstrap-step.enum.js';
import { EmptyHostModule } from './utils/empty-host-module.js';
import { FakeNestApplication } from './utils/fake-nest-application.js';
import { RecordingHttpConfigurer } from './utils/recording-http-configurer.js';

const LISTENING_SERVER = {
  address: () => ({ address: '127.0.0.1', port: 4321 }),
};

describe('ServiceBootstrap', () => {
  const definition = ServiceDefinitionBuilder.aDefinition('identity').build();
  let steps: BootstrapStep[];

  beforeEach(() => {
    steps = [];
    jest
      .spyOn(ServiceHostModule, 'forService')
      .mockReturnValue({ module: EmptyHostModule });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('http', () => {
    it('configures, enables shutdown hooks and listens, in that order', async () => {
      const app = new FakeNestApplication(steps, LISTENING_SERVER);
      jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(app.asNestApplication());

      await ServiceBootstrap.http(definition, {
        http: { configurer: new RecordingHttpConfigurer(steps) },
      });

      expect(steps).toEqual([
        BootstrapStep.Configure,
        BootstrapStep.EnableShutdownHooks,
        BootstrapStep.Listen,
      ]);
    });

    it('listens on port 3000 and host 0.0.0.0 by default', async () => {
      const app = new FakeNestApplication(steps, LISTENING_SERVER);
      jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(app.asNestApplication());

      await ServiceBootstrap.http(definition);

      expect(app.listened).toEqual([{ port: 3000, host: '0.0.0.0' }]);
    });

    it('creates the application with the adapter as second argument', async () => {
      const app = new FakeNestApplication(steps, LISTENING_SERVER);
      const adapter = {} as AbstractHttpAdapter;
      const create = jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(app.asNestApplication());

      await ServiceBootstrap.http(definition, { http: { adapter } });

      expect(create).toHaveBeenCalledWith(
        { module: EmptyHostModule },
        adapter,
        expect.objectContaining({ abortOnError: false }),
      );
    });

    it('returns the definition name and the listening address', async () => {
      const app = new FakeNestApplication(steps, LISTENING_SERVER);
      jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(app.asNestApplication());

      const running = await ServiceBootstrap.http(definition);

      expect(running.name).toBe('identity');
      expect(running.address).toEqual({ host: '127.0.0.1', port: 4321 });
    });

    it('leaves the address undefined when the server reports a string', async () => {
      const app = new FakeNestApplication(steps, {
        address: () => '/tmp/socket',
      });
      jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(app.asNestApplication());

      const running = await ServiceBootstrap.http(definition);

      expect(running.address).toBeUndefined();
    });

    it('rejects an invalid definition without creating the application', async () => {
      const create = jest.spyOn(NestFactory, 'create');
      const invalid = ServiceDefinitionBuilder.aDefinition('identity')
        .with({ name: 'otro' })
        .build();

      await expect(ServiceBootstrap.http(invalid)).rejects.toThrow(
        InvalidServiceDefinitionError,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('passes the env of the options to the host and no undefined keys', async () => {
      const app = new FakeNestApplication(steps, LISTENING_SERVER);
      jest
        .spyOn(NestFactory, 'create')
        .mockResolvedValue(app.asNestApplication());
      const env = { SERVICE_NAME: 'identity' };

      await ServiceBootstrap.http(definition, { env });

      const [, options] =
        jest.mocked(ServiceHostModule.forService).mock.calls[0] ?? [];
      expect(options?.env).toBe(env);
      expect(Object.keys(options ?? {})).toEqual(['env']);
    });
  });

  describe('worker', () => {
    it('enables shutdown hooks without listening', async () => {
      const app = new FakeNestApplication(steps, undefined);
      jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValue(app.asNestApplication());

      await ServiceBootstrap.worker(definition);

      expect(steps).toEqual([BootstrapStep.EnableShutdownHooks]);
    });

    it('returns a running service without an address', async () => {
      const app = new FakeNestApplication(steps, undefined);
      jest
        .spyOn(NestFactory, 'createApplicationContext')
        .mockResolvedValue(app.asNestApplication());

      const running = await ServiceBootstrap.worker(definition);

      expect(running.name).toBe('identity');
      expect(running.address).toBeUndefined();
    });
  });
});
