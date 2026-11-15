import { CallOutcome, CallOutcomeKind } from '@platform/primitives';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { ScriptedHandler } from '../../server/__tests__/utils/scripted-handler.js';
import { ServerHarness } from '../../server/__tests__/utils/server-harness.js';
import { InProcessTransport } from '../in-process-transport.js';
import { defineOperation } from '@contracts/platform';
import { z } from 'zod';

const Reserve = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string(), qty: z.number().int().positive() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: 'stock.release.v1',
  errors: [ServerHarness.OUT_OF_STOCK],
  description: 'Reserves stock.',
});

describe('InProcessTransport', () => {
  it('invoke, registered operation, delivers the input and the call metadata and returns the handler result', async () => {
    const harness = new ServerHarness();
    const handler = new ScriptedHandler<typeof Reserve>().thenReturn({
      outcome: CallOutcome.success({ reservationId: 'r-1' }),
    });
    harness.router.register(Reserve, handler);
    const transport = new InProcessTransport(harness.router);
    const meta = harness.meta('k', { tenantId: 't-1' });

    const outcome = await transport.invoke(
      'stock.reserve.v1',
      { sku: 'A', qty: 1 },
      meta,
    );

    expect(outcome).toEqual(CallOutcome.success({ reservationId: 'r-1' }));
    expect(handler.inputs).toEqual([{ sku: 'A', qty: 1 }]);
    expect(handler.contexts).toEqual([meta]);
  });

  it('invoke, unknown operation, answers unknown-operation', async () => {
    const harness = new ServerHarness();
    const transport = new InProcessTransport(harness.router);

    const outcome = await transport.invoke(
      'stock.nope.v1',
      {},
      harness.meta('k'),
    );

    expect(outcome).toMatchObject({
      kind: CallOutcomeKind.ProtocolViolation,
      reason: InternalApiReason.UnknownOperation,
    });
  });
});
