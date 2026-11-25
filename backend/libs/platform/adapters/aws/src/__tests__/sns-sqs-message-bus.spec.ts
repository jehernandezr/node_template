import { RecordingEnvelopePublisher } from '@platform/messaging/test-utils';
import { defineCommand } from '@contracts/platform';
import {
  MessagingErrorCode,
  TargetKind,
  topologyFromContracts,
} from '@platform/messaging';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { z } from 'zod';
import { SnsSqsMessageBus } from '../sns-sqs-message-bus.js';
import {
  GenerateReport,
  LedgerPosted,
  ledgerContract,
  reportsContract,
  tasksContract,
} from './utils/test-contracts.js';

const Unrouted = defineCommand({
  type: 'unrouted.report.unrouted.v1',
  payload: z.object({}),
  description: 'Command with no route in the topology.',
});

function setup() {
  const publisher = new RecordingEnvelopePublisher();
  const bus = new SnsSqsMessageBus({
    topology: topologyFromContracts([
      tasksContract,
      reportsContract,
      ledgerContract,
    ]),
    publisher,
    source: '/services/reports',
    clock: new FixedClock(),
    ids: new SequentialIdGenerator(),
    traceparent: () => undefined,
  });
  return { bus, publisher };
}

describe('SnsSqsMessageBus', () => {
  it('sends commands and publishes events through the publisher', async () => {
    const { bus, publisher } = setup();

    const sent = await bus.send(
      GenerateReport,
      { reportId: 'r-1' },
      { delayMs: 5_000 },
    );
    await bus.publish(
      LedgerPosted,
      { accountId: 'a-1', amount: 3 },
      { groupId: 'a-1' },
    );

    expect(publisher.published).toEqual([
      {
        envelope: sent,
        target: { kind: TargetKind.Queue, name: 'reports-work', fifo: false },
        options: { delayMs: 5_000 },
      },
      {
        envelope: expect.objectContaining({
          type: LedgerPosted.type,
          source: '/services/reports',
          data: { accountId: 'a-1', amount: 3 },
        }),
        target: { kind: TargetKind.Topic, name: 'ledger-events', fifo: true },
        options: { groupId: 'a-1' },
      },
    ]);
    expect(sent.data).toEqual({ reportId: 'r-1' });
  });

  it('rejects a message whose route is not in the topology', async () => {
    const { publisher } = setup();
    const isolated = new SnsSqsMessageBus({
      topology: topologyFromContracts([tasksContract]),
      publisher,
      source: '/services/reports',
    });

    await expect(isolated.send(Unrouted, {})).rejects.toMatchObject({
      code: MessagingErrorCode.UnknownRoute,
    });
    expect(publisher.published).toHaveLength(0);
  });
});
