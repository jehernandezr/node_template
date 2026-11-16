import { SmokeStockHandlers } from '../smoke-stock-handlers.js';
import { CallOutcomeKind } from '@platform/primitives';

describe('SmokeStockHandlers', () => {
  it('reserves and releases stock for an order', async () => {
    const handlers = new SmokeStockHandlers();

    const reserved = await handlers.reserve({ orderId: 'o-1' });
    expect(reserved.outcome.kind).toBe(CallOutcomeKind.Success);
    expect(handlers.isReserved('o-1')).toBe(true);

    const released = await handlers.release({ orderId: 'o-1' });
    expect(released.outcome.kind).toBe(CallOutcomeKind.Success);
    expect(handlers.isReserved('o-1')).toBe(false);
  });

  it('declines the payment verification when asked to fail', async () => {
    const handlers = new SmokeStockHandlers();

    const declined = await handlers.verify({ orderId: 'o-1', fail: true });
    expect(declined.outcome.kind).toBe(CallOutcomeKind.BusinessError);

    const verified = await handlers.verify({ orderId: 'o-1', fail: false });
    expect(verified.outcome.kind).toBe(CallOutcomeKind.Success);
  });
});
