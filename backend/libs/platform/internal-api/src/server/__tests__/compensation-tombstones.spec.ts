import { CallOutcome } from '@platform/primitives';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { ServerHarness } from './utils/server-harness.js';
import {
  ReleaseHandler,
  ReserveHandler,
  StockLedger,
  StockOperations,
} from './utils/stock-ledger.js';

const { Reserve, Release } = StockOperations;
const FORWARD = 'saga-1:0:forward';
const COMPENSATE = 'saga-1:0:compensate';

function setup(gate?: Promise<void>) {
  const harness = new ServerHarness();
  const ledger = new StockLedger();
  const reserve = new ReserveHandler(ledger, gate);
  harness.router.register(Reserve, reserve);
  harness.router.register(Release, new ReleaseHandler(ledger));
  const call = (operationId: string, input: unknown, key: string) =>
    harness.router.handle(operationId, input, harness.meta(key));
  return { harness, ledger, reserve, call };
}

describe('CompensationTombstones', () => {
  it('keeps a step that arrives after its compensation from reserving what nobody would release', async () => {
    const { ledger, reserve, call } = setup();

    const released = await call(
      Release.id,
      { reservationId: 'sku-1' },
      COMPENSATE,
    );
    const late = await call(Reserve.id, { sku: 'sku-1' }, FORWARD);

    expect(released).toEqual(CallOutcome.success({ released: false }));
    expect(late).toMatchObject({
      code: InternalApiErrorCode.StepCompensated,
    });
    expect(reserve.calls).toBe(0);
    expect(ledger.reserved.size).toBe(0);
  });

  it('makes the compensation wait for a step still in flight and then releases what the step reserved', async () => {
    let finish!: () => void;
    const { harness, ledger, call } = setup(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );

    const step = call(Reserve.id, { sku: 'sku-2' }, FORWARD);
    await harness.settle();
    const early = await call(
      Release.id,
      { reservationId: 'sku-2' },
      COMPENSATE,
    );
    finish();
    await step;
    const retried = await call(
      Release.id,
      { reservationId: 'sku-2' },
      COMPENSATE,
    );

    expect(early).toEqual(
      CallOutcome.transientFailure(InternalApiReason.InProgress),
    );
    expect(retried).toEqual(CallOutcome.success({ released: true }));
    expect(ledger.reserved.size).toBe(0);
  });

  it('releases a step that already finished without blocking it', async () => {
    const { ledger, call } = setup();
    await call(Reserve.id, { sku: 'sku-3' }, FORWARD);

    const released = await call(
      Release.id,
      { reservationId: 'sku-3' },
      COMPENSATE,
    );
    const replay = await call(Reserve.id, { sku: 'sku-3' }, FORWARD);

    expect(released).toEqual(CallOutcome.success({ released: true }));
    expect(replay).toEqual(CallOutcome.success({ reservationId: 'sku-3' }));
    expect(ledger.reserved.size).toBe(0);
  });
});
