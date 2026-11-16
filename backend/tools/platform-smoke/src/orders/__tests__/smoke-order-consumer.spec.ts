import { SmokeOrderConsumer } from '../smoke-order-consumer.js';
import { SmokeOrderLedger } from '../smoke-order-ledger.js';

describe('SmokeOrderConsumer', () => {
  it('records each delivery of a message in the ledger under its id', async () => {
    const ledger = new SmokeOrderLedger();
    const consumer = new SmokeOrderConsumer(ledger);
    const envelope = { id: 'msg-1' } as Parameters<
      SmokeOrderConsumer['onOrderCreated']
    >[1];

    await consumer.onOrderCreated(
      { orderId: 'o-1', customer: 'Ana' },
      envelope,
    );
    await consumer.onOrderCreated(
      { orderId: 'o-1', customer: 'Ana' },
      envelope,
    );

    expect(ledger.countOf('msg-1')).toBe(2);
    expect(ledger.countOf('msg-2')).toBe(0);
  });
});
