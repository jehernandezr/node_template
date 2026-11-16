import { Compensation, defineOperation } from '@contracts/platform';
import { OperationHandler, type HandlerResult } from '@platform/internal-api';
import { InProcessInternalApi } from '@platform/internal-api/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { z } from 'zod';
import { SagaDefinition } from '../../definition/saga-definition.js';
import type { SagaFlow } from '../../definition/saga-flow.js';
import { InternalClientInvoker } from '../internal-client-invoker.js';
import {
  CrashingSagaStore,
  ProcessDied,
} from '../../__tests__/utils/crashing-saga-store.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import { SagaStatus } from '../../model/saga-status.enum.js';

/** Presupuesto de estas pruebas: un intento de medio segundo. */
const FAST = {
  timeoutMs: 500,
  retry: { maxAttempts: 2, baseMs: 10, maxMs: 100 },
} as const;

const CreateAccount = defineOperation({
  id: 'acct.create.v1',
  input: z.object({ name: z.string().min(1) }),
  output: z.object({ accountId: z.string() }),
  idempotent: true,
  compensatedBy: 'acct.remove.v1',
  description: 'Creates an account.',
  ...FAST,
});

const RemoveAccount = defineOperation({
  id: 'acct.remove.v1',
  input: z.object({ accountId: z.string() }),
  output: z.object({ removed: z.boolean() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Removing an account is not undone.',
  description: 'Removes an account.',
  ...FAST,
});

const Notify = defineOperation({
  id: 'acct.notify.v1',
  input: z.object({ accountId: z.string() }),
  output: z.object({ sent: z.boolean() }),
  idempotent: true,
  mutating: false,
  description: 'Sends the welcome message.',
  ...FAST,
});

/** Manejador que cuenta sus llamadas y responde siempre con éxito. */
class CountingHandler extends OperationHandler {
  calls = 0;

  constructor(private readonly answer: Record<string, unknown>) {
    super();
  }

  override handle(): Promise<HandlerResult<never>> {
    this.calls += 1;
    return Promise.resolve({
      outcome: CallOutcome.success(this.answer),
    } as HandlerResult<never>);
  }
}

interface OnboardingState {
  name: string;
  accountId?: string;
}

class OnboardingSaga extends SagaDefinition<OnboardingState> {
  readonly type = 'onboarding';

  protected define(flow: SagaFlow<OnboardingState>): void {
    flow
      .step(CreateAccount)
      .input((s) => ({ name: s.name }))
      .onSuccess((s, out) => {
        s.accountId = out.accountId;
      })
      .compensationInput((s) => ({ accountId: s.accountId ?? '' }))
      .pivot()
      .step(Notify)
      .input((s) => ({ accountId: s.accountId ?? '' }));
  }
}

function wire() {
  const api = new InProcessInternalApi({
    clock: new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
    ids: new SequentialIdGenerator(),
    operations: [CreateAccount, RemoveAccount, Notify],
  });
  const created = new CountingHandler({
    accountId: 'acc-1',
  });
  const notified = new CountingHandler({ sent: true });
  api.router.register(CreateAccount, created);
  api.router.register(RemoveAccount, new CountingHandler({ removed: true }));
  api.router.register(Notify, notified);
  const store = new CrashingSagaStore();
  const kit = new SagaEngineKit({
    invoker: new InternalClientInvoker(api.client),
    definitions: [new OnboardingSaga()],
    store,
  });
  return { kit, store, created, notified };
}

describe('InternalClientInvoker con SagaEngine', () => {
  it('lleva la saga de punta a punta por la API interna', async () => {
    const { kit, created, notified } = wire();

    const result = await kit.sagas.start(
      OnboardingSaga,
      { name: 'Ana' },
      { sagaId: 's1' },
    );

    expect(result.status).toBe(SagaStatus.Completed);
    expect(result.state).toEqual({ name: 'Ana', accountId: 'acc-1' });
    expect(created.calls).toBe(1);
    expect(notified.calls).toBe(1);
  });

  it('reenvía tras una caída la misma llave y el manejador no repite el efecto', async () => {
    const { kit, store, created } = wire();
    store.crashBeforeOutcome(0);

    await expect(
      kit.sagas.start(OnboardingSaga, { name: 'Ana' }, { sagaId: 's1' }),
    ).rejects.toBeInstanceOf(ProcessDied);
    expect(created.calls).toBe(1);

    kit.clock.advance(30_001);
    const resumed = await kit.engineFor('node-b').resume('s1');

    expect(resumed.status).toBe(SagaStatus.Completed);
    expect(created.calls).toBe(1);
  });
});
