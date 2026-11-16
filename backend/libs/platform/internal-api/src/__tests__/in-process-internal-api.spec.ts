import { defineOperation } from '@contracts/platform';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { z } from 'zod';
import type { HandlerResult } from '../server/handler-result.js';
import { OperationHandler } from '../server/operation-handler.js';
import {
  InProcessInternalApi,
  RecordingTransactionManager,
} from './utils/index.js';

const OpenAccount = defineOperation({
  id: 'ledger.accounts.open.v1',
  idempotent: true,
  mutating: false,
  description: 'Opens an account',
  input: z.object({ owner: z.string() }),
  output: z.object({ accountId: z.string() }),
});

class OpenAccountHandler extends OperationHandler<typeof OpenAccount> {
  calls = 0;

  constructor(private readonly commit: boolean) {
    super();
  }

  handle(input: {
    owner: string;
  }): Promise<HandlerResult<{ accountId: string }>> {
    this.calls += 1;
    return Promise.resolve({
      outcome: CallOutcome.success({ accountId: `acc-${input.owner}` }),
      commit: this.commit,
    });
  }
}

function setup(options: { commit?: boolean } = {}) {
  const transactions = new RecordingTransactionManager();
  const api = new InProcessInternalApi({
    clock: new FixedClock(new Date('2026-11-12T10:00:00.000Z')),
    ids: new SequentialIdGenerator(),
    operations: [OpenAccount],
    transactions,
  });
  const handler = new OpenAccountHandler(options.commit ?? true);
  api.router.register(OpenAccount, handler);
  return { api, handler, transactions };
}

describe('InProcessInternalApi', () => {
  it('call, registered handler, answers through the router and commits once', async () => {
    const { api, transactions } = setup();

    const outcome = await api.client.call(
      OpenAccount,
      { owner: 'ana' },
      { idempotencyKey: 'open-ana-1' },
    );

    expect(outcome).toEqual(CallOutcome.success({ accountId: 'acc-ana' }));
    expect(transactions.commits).toBe(1);
  });

  it('callById, same idempotency key twice, runs the handler once', async () => {
    const { api, handler } = setup();
    const options = { idempotencyKey: 'open-bea-1' };

    const first = await api.client.callById(
      OpenAccount.id,
      { owner: 'bea' },
      options,
    );
    const second = await api.client.callById(
      OpenAccount.id,
      { owner: 'bea' },
      options,
    );

    expect(second).toEqual(first);
    expect(handler.calls).toBe(1);
  });

  it('call, handler asks not to commit, rolls back its unit of work', async () => {
    const { api, transactions } = setup({ commit: false });

    await api.client.call(
      OpenAccount,
      { owner: 'eva' },
      { idempotencyKey: 'open-eva-1' },
    );

    expect(transactions).toMatchObject({ commits: 0, rollbacks: 1 });
  });
});
