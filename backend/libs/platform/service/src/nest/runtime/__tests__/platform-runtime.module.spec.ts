import { ConsistentHashStrategy } from '@platform/sharding';
import { SystemClock } from '@platform/kernel';
import { FailureClassifier } from '@platform/primitives';
import type { FactoryProvider } from '@nestjs/common';
import {
  CatalogIdempotencyStore,
  TypeOrmIdempotencyStore,
} from '@platform/adapters-postgres';
import { ProcessedOperationStore } from '@platform/internal-api';
import { DeliveryContext, TenantVerifier } from '@platform/messaging';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ShardKey, ShardRouter } from '@platform/sharding';
import { InMemoryDirectoryStore } from '@platform/sharding/test-utils';
import {
  DatabaseAuth,
  DatabaseTokenProvider,
  ShardScope,
} from '@platform/persistence';
import { RdsIamDatabaseTokenProvider } from '@platform/adapters-aws';
import { PlacedTenantVerifier } from '../../../messaging/placed-tenant-verifier.js';
import { TenantShardDeliveryContext } from '../../../messaging/tenant-shard-delivery-context.js';
import { AppConfig } from '@platform/config';
import { ValkeyAuthMode } from '@platform/adapters-valkey';
import {
  defineQueue,
  defineServiceContract,
  defineTopic,
} from '@contracts/platform';
import { AwsModule, SqsConsumerModule } from '@platform/adapters-aws/nest';
import { ValkeyModule } from '@platform/adapters-valkey/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { SchedulingModule } from '@platform/scheduling/nest';
import { MessagingModule } from '@platform/messaging/nest';
import { InternalApiModule } from '@platform/internal-api/nest';
import { SagaModule } from '@platform/saga/nest';
import { RecordingEnvelopePublisher } from '@platform/messaging/test-utils';
import { ServiceInternalTransport } from '../../../service-internal-api.js';
import { UseCaseRunner } from '../../../use-case-runner.js';
import {
  regionsConfigSchema,
  ServiceRegions,
} from '../../../regions/regions.config.js';
import {
  TenantWritesConfig,
  tenantWritesConfigSchema,
} from '../../../regions/tenant-writes.config.js';
import { InvalidServiceDefinitionError } from '../../../errors/invalid-service-definition.error.js';
import { ValkeyWriteGate } from '@platform/adapters-valkey';
import { TenantWriteGate } from '@platform/sharding';
import {
  ShardingModule,
  type ShardingModuleOptions,
} from '@platform/sharding/nest';
import type { Provider } from '@nestjs/common';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/index.js';
import { HealthModule } from '../../health/health.module.js';
import { KernelModule } from '@platform/kernel/nest';
import { PlatformRuntimeModule } from '../platform-runtime.module.js';
import { ImportedModules, RuntimeProbeRecorded } from './utils/index.js';

describe('PlatformRuntimeModule', () => {
  describe('forService', () => {
    describe('when no adapter is enabled', () => {
      it('is global, exports only the failure classifier, the use case runner and the regions, and starts with the kernel', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
        });

        expect(dynamic.global).toBe(true);
        expect(dynamic.exports).toEqual([
          FailureClassifier,
          UseCaseRunner,
          ServiceRegions,
        ]);
        expect(ImportedModules.of(dynamic)[0]).toBe(KernelModule);
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

    describe('when the pool authenticates with IAM', () => {
      const definition = ServiceDefinitionBuilder.aDefinition().build();

      it('registers the RDS signer in AWS and hands it to persistence as its tokens', () => {
        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: { DB_AUTH: DatabaseAuth.Iam },
          adapters: { valkey: false, aws: true },
        });

        expect(
          ImportedModules.find(dynamic, AwsModule)?.providers,
        ).toContainEqual(
          expect.objectContaining({ provide: RdsIamDatabaseTokenProvider }),
        );
        expect(
          ImportedModules.find(dynamic, PersistenceModule)?.providers,
        ).toContainEqual({
          provide: DatabaseTokenProvider,
          useExisting: RdsIamDatabaseTokenProvider,
        });
      });

      it('keeps the password without DB_AUTH=iam', () => {
        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: true },
        });

        expect(
          ImportedModules.find(dynamic, AwsModule)?.providers,
        ).not.toContainEqual(
          expect.objectContaining({ provide: RdsIamDatabaseTokenProvider }),
        );
      });

      it('refuses IAM without the AWS adapter', () => {
        expect(() =>
          PlatformRuntimeModule.forService(definition, {
            env: { DB_AUTH: DatabaseAuth.Iam },
            adapters: { valkey: false, aws: false },
          }),
        ).toThrow(InvalidServiceDefinitionError);
      });
    });

    describe('when the process consumes the queues of its contract', () => {
      const probeEvents = defineTopic({
        name: 'runtime-probe-queue-events',
        events: [RuntimeProbeRecorded],
        description: 'Events the queue probe consumes.',
      });
      const definition = ServiceDefinitionBuilder.aDefinition('runtime-probe')
        .with({
          contract: defineServiceContract({
            service: 'runtime-probe',
            description: 'Service with two queues.',
            events: { probeRecorded: RuntimeProbeRecorded },
            topics: { probeEvents },
            queues: {
              first: defineQueue({
                name: 'runtime-probe-first',
                subscriptions: [{ topic: probeEvents }],
                description: 'First queue.',
              }),
              second: defineQueue({
                name: 'runtime-probe-second',
                subscriptions: [{ topic: probeEvents }],
                description: 'Second queue.',
              }),
            },
          }),
        })
        .build();
      const consumersOf = (
        aws: boolean,
        consumeQueues?: boolean,
        env: Record<string, string> = {},
      ) =>
        ImportedModules.of(
          PlatformRuntimeModule.forService(definition, {
            env,
            adapters: { valkey: false, aws },
            ...(consumeQueues === undefined ? {} : { consumeQueues }),
          }),
        );

      it('polls each queue with AWS, after the scheduler and before health, so the pollers stop first', () => {
        const modules = consumersOf(true, true);
        const consumers = modules.flatMap((module, index) =>
          module === SqsConsumerModule ? [index] : [],
        );

        expect(consumers).toHaveLength(2);
        expect(Math.min(...consumers)).toBeGreaterThan(
          modules.indexOf(SchedulingModule),
        );
        expect(Math.max(...consumers)).toBeLessThan(
          modules.indexOf(HealthModule),
        );
      });

      it('polls only the queue of QUEUE_URL, as a deployed worker per queue does', () => {
        const modules = consumersOf(true, true, {
          QUEUE_URL:
            'https://sqs.us-east-1.amazonaws.com/123456789012/dev-runtime-probe-second',
          MESSAGING_NAME_PREFIX: 'dev',
        });

        expect(
          modules.filter((module) => module === SqsConsumerModule),
        ).toHaveLength(1);
      });

      it.each([
        ['an API process', true, undefined],
        ['a process without AWS', false, true],
      ])('polls nothing in %s', (_, aws, consumeQueues) => {
        expect(consumersOf(aws, consumeQueues)).not.toContain(
          SqsConsumerModule,
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

    describe('when the service requires a ShardScope', () => {
      it('keeps the idempotency keys of its internal API in the catalog', () => {
        const definition = ServiceDefinitionBuilder.aDefinition()
          .with({ sharding: { defaultKey: ShardKey.User, requireScope: true } })
          .build();

        const internalApi = ImportedModules.find(
          PlatformRuntimeModule.forService(definition, {
            env: {},
            adapters: { valkey: false, aws: false },
          }),
          InternalApiModule,
        );

        expect(internalApi?.providers).toContainEqual({
          provide: ProcessedOperationStore,
          useExisting: CatalogIdempotencyStore,
        });
      });

      it('delivers each message in the shard of the tenant of its envelope', async () => {
        const definition = ServiceDefinitionBuilder.aDefinition()
          .with({ sharding: { defaultKey: ShardKey.User, requireScope: true } })
          .build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
        });
        const messaging = ImportedModules.find(dynamic, MessagingModule);
        const providers = (dynamic.providers ?? []) as FactoryProvider[];
        const factoryOf = (token: unknown) =>
          providers.find((provider) => provider.provide === token)?.useFactory;
        const router = new ShardRouter({
          strategy: new ConsistentHashStrategy(),
          clock: new SystemClock(),
          directory: new InMemoryDirectoryStore(),
        });
        const built = [
          factoryOf(PlacedTenantVerifier)?.(router),
          factoryOf(TenantShardDeliveryContext)?.(
            new ShardScope(router),
            new RequestContextStore(new Tracing(new Redactor())),
          ),
        ];

        expect(messaging?.providers).toEqual(
          expect.arrayContaining([
            { provide: TenantVerifier, useExisting: PlacedTenantVerifier },
            {
              provide: DeliveryContext,
              useExisting: TenantShardDeliveryContext,
            },
          ]),
        );
        expect(dynamic.exports).toEqual(
          expect.arrayContaining([
            PlacedTenantVerifier,
            TenantShardDeliveryContext,
          ]),
        );
        expect(built).toEqual([
          expect.any(PlacedTenantVerifier),
          expect.any(TenantShardDeliveryContext),
        ]);
      });

      it('keeps the delivery of a service without shards as it was', () => {
        const dynamic = PlatformRuntimeModule.forService(
          ServiceDefinitionBuilder.aDefinition().build(),
          { env: {}, adapters: { valkey: false, aws: false } },
        );

        expect(
          ImportedModules.find(dynamic, MessagingModule)?.providers,
        ).not.toContainEqual(
          expect.objectContaining({ provide: DeliveryContext }),
        );
      });

      it('keeps them in the shards when the service does not require one', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const internalApi = ImportedModules.find(
          PlatformRuntimeModule.forService(definition, {
            env: {},
            adapters: { valkey: false, aws: false },
          }),
          InternalApiModule,
        );

        expect(internalApi?.providers).toContainEqual({
          provide: ProcessedOperationStore,
          useExisting: TypeOrmIdempotencyStore,
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
      it('exports only the failure classifier, the use case runner and the regions', () => {
        const definition = ServiceDefinitionBuilder.aDefinition().build();

        const dynamic = PlatformRuntimeModule.forService(definition, {
          env: {},
          adapters: { valkey: false, aws: false },
        });

        expect(dynamic.exports).toEqual([
          FailureClassifier,
          UseCaseRunner,
          ServiceRegions,
        ]);
      });
    });

    describe('when choosing the write gate of the tenant moves', () => {
      const writeGateOf = (
        env: Record<string, string>,
        valkey: boolean,
      ): Provider | undefined => {
        const dynamic = PlatformRuntimeModule.forService(
          ServiceDefinitionBuilder.aDefinition().build(),
          { env, adapters: { valkey, aws: false } },
        );
        const sharding = ImportedModules.find(dynamic, ShardingModule);
        return (sharding?.providers ?? []).find(
          (provider) =>
            (provider as { provide?: unknown }).provide === TenantWriteGate,
        );
      };

      it('closes it in the directory by default', () => {
        expect(writeGateOf({}, true)).not.toHaveProperty(
          'useExisting',
          ValkeyWriteGate,
        );
      });

      it('closes it in Valkey when asked to', () => {
        expect(
          writeGateOf({ TENANT_WRITE_GATE: 'valkey' }, true),
        ).toHaveProperty('useExisting', ValkeyWriteGate);
      });

      it('lets a write wait for the gate as long as TENANT_MOVE_MAX_WAIT_MS says', () => {
        const dynamic = PlatformRuntimeModule.forService(
          ServiceDefinitionBuilder.aDefinition().build(),
          { env: {}, adapters: { valkey: false, aws: false } },
        );
        const sharding = ImportedModules.find(dynamic, ShardingModule);
        const options = (sharding?.providers ?? []).find((provider) =>
          (provider as { inject?: unknown[] }).inject?.includes(
            TenantWritesConfig.token,
          ),
        ) as
          | { useFactory: (...settings: unknown[]) => ShardingModuleOptions }
          | undefined;

        const built = options?.useFactory(
          regionsConfigSchema.parse({}),
          tenantWritesConfigSchema.parse({ TENANT_MOVE_MAX_WAIT_MS: '1500' }),
        );

        expect(built?.writeWait).toEqual({ maxWaitMs: 1_500, pollMs: 100 });
      });

      it('refuses a max wait that is not a number of milliseconds', () => {
        expect(() =>
          writeGateOf({ TENANT_MOVE_MAX_WAIT_MS: 'soon' }, true),
        ).toThrow(InvalidServiceDefinitionError);
      });

      it('refuses Valkey without Valkey and an unknown gate', () => {
        expect(() =>
          writeGateOf({ TENANT_WRITE_GATE: 'valkey' }, false),
        ).toThrow(InvalidServiceDefinitionError);
        expect(() => writeGateOf({ TENANT_WRITE_GATE: 'etcd' }, true)).toThrow(
          InvalidServiceDefinitionError,
        );
      });
    });
  });
});
