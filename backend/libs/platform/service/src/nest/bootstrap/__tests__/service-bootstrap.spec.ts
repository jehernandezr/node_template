import type { AbstractHttpAdapter } from '@nestjs/core';
import { InvalidServiceDefinitionError } from '../../../errors/invalid-service-definition.error.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/service-definition.builder.js';
import { ServiceHostModule } from '../../runtime/service-host.module.js';
import { ServiceBootstrap } from '../service-bootstrap.js';
import { BootstrapStep } from './utils/bootstrap-step.enum.js';
import { FakeNestApplication } from './utils/fake-nest-application.js';
import { ModuleTree } from './utils/module-tree.js';
import { RecordingApplicationFactory } from './utils/recording-application-factory.js';
import { RecordingHttpConfigurer } from './utils/recording-http-configurer.js';

const LISTENING_SERVER = {
  address: () => ({ address: '127.0.0.1', port: 4321 }),
};

describe('ServiceBootstrap', () => {
  const definition = ServiceDefinitionBuilder.aDefinition('identity').build();
  const env = { SERVICE_NAME: 'identity' };
  let steps: BootstrapStep[];

  beforeEach(() => {
    steps = [];
  });

  describe('http', () => {
    it('configures, enables shutdown hooks and listens, in that order', async () => {
      const applications = new RecordingApplicationFactory(
        new FakeNestApplication(steps, LISTENING_SERVER),
      );

      await ServiceBootstrap.http(definition, {
        env,
        applications,
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

      await ServiceBootstrap.http(definition, {
        env,
        applications: new RecordingApplicationFactory(app),
      });

      expect(app.listened).toEqual([{ port: 3000, host: '0.0.0.0' }]);
    });

    it('creates the application with the adapter of the options', async () => {
      const applications = new RecordingApplicationFactory(
        new FakeNestApplication(steps, LISTENING_SERVER),
      );
      const adapter = {} as AbstractHttpAdapter;

      await ServiceBootstrap.http(definition, {
        env,
        applications,
        http: { adapter },
      });

      expect(applications.requests.map((request) => request.adapter)).toEqual([
        adapter,
      ]);
    });

    it('returns the definition name and the listening address', async () => {
      const running = await ServiceBootstrap.http(definition, {
        env,
        applications: new RecordingApplicationFactory(
          new FakeNestApplication(steps, LISTENING_SERVER),
        ),
      });

      expect(running.name).toBe('identity');
      expect(running.address).toEqual({ host: '127.0.0.1', port: 4321 });
    });

    it('leaves the address undefined when the server reports a string', async () => {
      const running = await ServiceBootstrap.http(definition, {
        env,
        applications: new RecordingApplicationFactory(
          new FakeNestApplication(steps, { address: () => '/tmp/socket' }),
        ),
      });

      expect(running.address).toBeUndefined();
    });

    it('rejects an invalid definition without creating the application', async () => {
      const applications = new RecordingApplicationFactory(
        new FakeNestApplication(steps, LISTENING_SERVER),
      );
      const invalid = ServiceDefinitionBuilder.aDefinition('identity')
        .with({ name: 'other' })
        .build();

      await expect(
        ServiceBootstrap.http(invalid, { env, applications }),
      ).rejects.toThrow(InvalidServiceDefinitionError);
      expect(applications.requests).toEqual([]);
    });

    it('hosts the service root module with the env of the options', async () => {
      const applications = new RecordingApplicationFactory(
        new FakeNestApplication(steps, LISTENING_SERVER),
      );

      await ServiceBootstrap.http(definition, { env, applications });

      const [request] = applications.requests;
      expect(request?.module.module).toBe(ServiceHostModule);
      expect(request?.module.imports).toContain(definition.rootModule);
      expect(new ModuleTree(request?.module).reaches(env)).toBe(true);
    });
  });

  describe('worker', () => {
    it('enables shutdown hooks without listening', async () => {
      await ServiceBootstrap.worker(definition, {
        env,
        applications: new RecordingApplicationFactory(
          new FakeNestApplication(steps, undefined),
        ),
      });

      expect(steps).toEqual([BootstrapStep.EnableShutdownHooks]);
    });

    it('returns a running service without an address', async () => {
      const running = await ServiceBootstrap.worker(definition, {
        env,
        applications: new RecordingApplicationFactory(
          new FakeNestApplication(steps, undefined),
        ),
      });

      expect(running.name).toBe('identity');
      expect(running.address).toBeUndefined();
    });
  });
});
