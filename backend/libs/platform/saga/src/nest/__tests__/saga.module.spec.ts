import { KernelModule } from '@platform/kernel/nest';
import { Compensation, defineOperation } from '@contracts/platform';
import { Global, Injectable, Module, type DynamicModule } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { RandomSource, SystemRandomSource } from '@platform/kernel';
import { FixedRandomSource } from '@platform/kernel/test-utils';
import {
  LoggerPort,
  Redactor,
  TraceContextRestorer,
  Tracing,
} from '@platform/observability';
import { z } from 'zod';
import { SagaDefinition } from '../../definition/saga-definition.js';
import type { SagaFlow } from '../../definition/saga-flow.js';
import { SagaEngine } from '../../engine/saga-engine.js';
import { SagaSettings } from '../../engine/saga-settings.js';
import { Sagas } from '../../engine/sagas.js';
import { SagaError } from '../../errors/saga-error.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import {
  FakeParticipant,
  InMemorySagaStore,
  RecordingLogger,
  ThreeStepSaga,
} from '../../__tests__/utils/index.js';
import { SagaRecoveryJob } from '../../jobs/saga-recovery-job.js';
import { SagaRetentionJob } from '../../jobs/saga-retention-job.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { SagaModule } from '../saga.module.js';

/** Randomness with a fixed value that the test can recognize. */
class FixedRandom extends FixedRandomSource {
  constructor() {
    super([0.25]);
  }
}

/**
 * What `SagaModule` needs from its environment and that in an app another
 * module would provide: the store, the invoker, the trace and the logger.
 */
@Global()
@Module({
  providers: [
    { provide: InMemorySagaStore, useFactory: () => new InMemorySagaStore() },
    { provide: FakeParticipant, useFactory: () => new FakeParticipant() },
    { provide: FixedRandom, useFactory: () => new FixedRandom() },
    { provide: Tracing, useFactory: () => new Tracing(new Redactor()) },
    {
      provide: TraceContextRestorer,
      useFactory: (tracing: Tracing) => new TraceContextRestorer(tracing),
      inject: [Tracing],
    },
    { provide: LoggerPort, useFactory: () => new RecordingLogger() },
  ],
  exports: [
    InMemorySagaStore,
    FakeParticipant,
    FixedRandom,
    Tracing,
    TraceContextRestorer,
    LoggerPort,
  ],
})
class SagaTestEnvironment {}

/** Use case that starts the saga with `Sagas`, as a service would. */
@Injectable()
class CreateOnboarding {
  constructor(private readonly sagas: Sagas) {}

  run(idempotencyKey: string) {
    return this.sagas.start(ThreeStepSaga, {}, { idempotencyKey });
  }
}

/** Definition without compensation before the pivot: sealing the registry must fail. */
class BrokenSaga extends SagaDefinition<unknown> {
  readonly type = 'broken';

  protected define(flow: SagaFlow<unknown>): void {
    flow
      .step(
        defineOperation({
          id: 'y.create.v1',
          input: z.unknown(),
          output: z.unknown(),
          idempotent: true,
          compensatedBy: Compensation.None,
          compensationReason: 'Nothing undoes it.',
          description: 'Creates a y for good.',
        }),
      )
      .step(
        defineOperation({
          id: 'z.create.v1',
          input: z.unknown(),
          output: z.unknown(),
          idempotent: true,
          compensatedBy: 'z.remove.v1',
          description: 'Creates a z.',
        }),
      );
  }
}

/** Minimal `forRoot` options, with the test timings. */
function rootOptions(
  extra: { owner?: string; random?: typeof FixedRandom } = {},
) {
  return {
    store: InMemorySagaStore,
    invoker: FakeParticipant,
    leaseMs: 1000,
    maxStepDurationMs: 100,
    ...extra,
  };
}

/** Test module with the given `SagaModule` and the use case. */
async function compile(imports: DynamicModule[]): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [KernelModule, SagaTestEnvironment, ...imports],
    providers: [CreateOnboarding],
  }).compile();
}

describe('SagaModule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  it('a use case injects Sagas and its saga ends Completed; the repeated key returns the same one', async () => {
    moduleRef = await compile([
      SagaModule.forRoot(rootOptions()),
      SagaModule.forFeature([ThreeStepSaga]),
    ]);
    await moduleRef.init();
    const useCase = moduleRef.get(CreateOnboarding);

    const first = await useCase.run('key-1');
    const again = await useCase.run('key-1');

    expect(first.status).toBe(SagaStatus.Completed);
    expect(again.id).toBe(first.id);
  });

  it('forRoot without a store throws SagaError InvalidConfiguration', () => {
    const attempt = () => SagaModule.forRoot({ invoker: FakeParticipant });

    expect(attempt).toThrow(SagaError);
    try {
      attempt();
    } catch (error) {
      expect((error as SagaError).code).toBe(
        SagaErrorCode.InvalidConfiguration,
      );
    }
  });

  it('an invalid definition registered with forFeature breaks startup', async () => {
    moduleRef = await compile([
      SagaModule.forRoot(rootOptions()),
      SagaModule.forFeature([BrokenSaga]),
    ]);

    await expect(moduleRef.init()).rejects.toBeInstanceOf(SagaError);
  });

  it('Sagas, SagaEngine, SagaRecoveryJob and SagaRetentionJob can be resolved', async () => {
    moduleRef = await compile([SagaModule.forRoot(rootOptions())]);
    await moduleRef.init();

    expect(moduleRef.get(Sagas)).toBeInstanceOf(Sagas);
    expect(moduleRef.get(SagaEngine)).toBeInstanceOf(SagaEngine);
    expect(moduleRef.get(SagaRecoveryJob)).toBeInstanceOf(SagaRecoveryJob);
    expect(moduleRef.get(SagaRetentionJob)).toBeInstanceOf(SagaRetentionJob);
  });

  it('owner, leaseMs and maxStepDurationMs reach SagaSettings with their values', async () => {
    moduleRef = await compile([
      SagaModule.forRoot(rootOptions({ owner: 'node-z' })),
    ]);
    await moduleRef.init();

    const settings = moduleRef.get(SagaSettings);

    expect(settings.owner).toBe('node-z');
    expect(settings.leaseMs).toBe(1000);
    expect(settings.maxStepDurationMs).toBe(100);
  });

  it('without owner, leaseMs or maxStepDurationMs it uses the default values', async () => {
    moduleRef = await compile([
      SagaModule.forRoot({
        store: InMemorySagaStore,
        invoker: FakeParticipant,
      }),
    ]);
    await moduleRef.init();

    const settings = moduleRef.get(SagaSettings);

    expect(settings.owner).toMatch(/^[0-9a-f-]{36}$/);
    expect(settings.leaseMs).toBe(SagaSettings.DEFAULT_LEASE_MS);
    expect(settings.maxStepDurationMs).toBe(SagaSettings.DEFAULT_MAX_STEP_MS);
  });

  it('the random option is used as the randomness source when passed', async () => {
    moduleRef = await compile([
      SagaModule.forRoot(rootOptions({ random: FixedRandom })),
    ]);
    await moduleRef.init();

    expect(moduleRef.get(RandomSource)).toBeInstanceOf(FixedRandom);
  });

  it('without random, the randomness source is SystemRandomSource', async () => {
    moduleRef = await compile([SagaModule.forRoot(rootOptions())]);
    await moduleRef.init();

    expect(moduleRef.get(RandomSource)).toBeInstanceOf(SystemRandomSource);
  });
});
