import type { FactoryProvider } from '@nestjs/common';
import { AppConfig } from '@platform/config';
import { ValkeyAuthMode } from '@platform/adapters-valkey';
import { AwsModule } from '@platform/adapters-aws/nest';
import { ValkeyModule } from '@platform/adapters-valkey/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { SchedulingModule } from '@platform/scheduling/nest';
import { MessagingModule } from '@platform/messaging/nest';
import { InternalApiModule } from '@platform/internal-api/nest';
import { SagaModule } from '@platform/saga/nest';
import { RecordingEnvelopePublisher } from '@platform/messaging/test-utils';
import { ServiceInternalTransport } from '../../../service-internal-api.js';
import { UseCaseRunner } from '../../../use-case-runner.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/index.js';
import { HealthModule } from '../../health/health.module.js';
import { PlatformKernelModule } from '../platform-kernel.module.js';
import { PlatformRuntimeModule } from '../platform-runtime.module.js';
import { ImportedModules } from './utils/index.js';

describe('PlatformRuntimeModule', () => {
  describe('forService', () => {
    describe('when no adapter is enabled', () => {
      it('is global, exports only the use case runner and starts with the kernel', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
        });

        expect(dynamic.global).toBe(true);
        expect(dynamic.exports).toEqual([UseCaseRunner]);
        expect(ImportedModules.of(dynamic)[0]).toBe(PlatformKernelModule);
      });

      it('does not import the Valkey or AWS adapters', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const modules = ImportedModules.of(
          PlatformRuntimeModule.forService(definition, {
            env: {},
            adapters: { valkey: false, aws: false },
          }),
        );

        expect(modules).not.toContain(ValkeyModule);
        expect(modules).not.toContain(AwsModule);
      });
    });

    describe('when Valkey and AWS are enabled with IAM for serverless Valkey', () => {
      it('imports both adapters, AWS before Valkey and Valkey before persistence', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const modules = ImportedModules.of(
          PlatformRuntimeModule.forService(definition, {
            env: { VALKEY_AUTH: ValkeyAuthMode.IamServerless },
            adapters: { valkey: true, aws: true },
          }),
        );

        expect(modules).toContain(AwsModule);
        expect(modules).toContain(ValkeyModule);
        expect(modules.indexOf(AwsModule)).toBeLessThan(
          modules.indexOf(ValkeyModule),
        );
        expect(modules.indexOf(ValkeyModule)).toBeLessThan(
          modules.indexOf(PersistenceModule),
        );
      });
    });

    describe('when ordering the shutdown', () => {
      it('imports the scheduler after the modules whose jobs it runs, and health last', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const modules = ImportedModules.of(
          PlatformRuntimeModule.forService(definition, {
            env: {},
            adapters: { valkey: false, aws: false },
          }),
        );

        const scheduling = modules.indexOf(SchedulingModule);
        expect(scheduling).toBeGreaterThan(modules.indexOf(PersistenceModule));
        expect(scheduling).toBeGreaterThan(modules.indexOf(MessagingModule));
        expect(scheduling).toBeGreaterThan(modules.indexOf(InternalApiModule));
        expect(scheduling).toBeGreaterThan(modules.indexOf(SagaModule));
        expect(modules.at(-1)).toBe(HealthModule);
      });
    });

    describe('when the service serves its internal API over HTTP', () => {
      it('builds the internal API module from the configuration', () => {
        const definition = ServiceDefinitionBuilder.aDefinition()
          .with({
            internalApi: {
              transport: ServiceInternalTransport.Http,
              http: () => ({ baseUrls: {}, secret: 'test-secret' }),
            },
          })
          .build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
        });

        const internalApi = ImportedModules.find(dynamic, InternalApiModule);
        expect(internalApi?.providers).toContainEqual(
          expect.objectContaining({
            inject: expect.arrayContaining([AppConfig]),
          }),
        );

        const optionsProvider = internalApi?.providers?.find(
          (provider) =>
            typeof provider === 'object' &&
            'inject' in provider &&
            provider.inject?.includes(AppConfig) === true,
        ) as FactoryProvider | undefined;
        expect(optionsProvider?.useFactory({} as AppConfig)).toEqual({
          operations: [],
          remoteOperations: [],
          http: { baseUrls: {}, secret: 'test-secret' },
        });
      });
    });

    describe('when the service passes its own publisher', () => {
      it('registers and exports the publisher', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
          publisher: RecordingEnvelopePublisher,
        });

        expect(dynamic.providers).toContain(RecordingEnvelopePublisher);
        expect(dynamic.exports).toContain(RecordingEnvelopePublisher);
      });
    });

    describe('when there is no publisher and AWS is disabled', () => {
      it('exports only the use case runner', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
        });

        expect(dynamic.exports).toEqual([UseCaseRunner]);
      });
    });
  });
});
