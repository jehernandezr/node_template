import { FailureClassifier } from '@platform/primitives';
import {
  CircuitOpenError,
  ResilienceRegistryFactory,
} from '@platform/resilience';
import { SystemRandomSource } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import {
  EnvelopeBuilder,
  RecordingEnvelopePublisher,
} from '../../__tests__/utils/index.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import type { OutboundTarget } from '../../outbox/outbox.js';
import { TargetKind } from '../../topology/target-kind.enum.js';
import { ResilientEnvelopePublisher } from '../resilient-envelope-publisher.js';
import { MessagingPolicies } from '../messaging-policies.js';

const TOPIC: OutboundTarget = {
  kind: TargetKind.Topic,
  name: 'user-events',
  fifo: false,
};
const OTHER_QUEUE: OutboundTarget = {
  kind: TargetKind.Queue,
  name: 'notifications',
  fifo: false,
};
const envelope = EnvelopeBuilder.anEnvelope({ id: 'msg-1' });

function setup() {
  const registry = new ResilienceRegistryFactory().create(
    {},
    {
      clock: new FixedClock(),
      random: new SystemRandomSource(),
      classifier: new FailureClassifier(),
    },
  );
  registry.register(MessagingPolicies.Queue, MessagingPolicies.queue);
  const inner = new RecordingEnvelopePublisher();
  const publisher = new ResilientEnvelopePublisher(inner, registry);
  return { inner, publisher };
}

describe('ResilientEnvelopePublisher', () => {
  it('passes the envelope, target and options to the inner publisher', async () => {
    const { inner, publisher } = setup();

    await publisher.publish(envelope, TOPIC, { groupId: 'order-1' });

    expect(inner.published).toEqual([
      { envelope, target: TOPIC, options: { groupId: 'order-1' } },
    ]);
  });

  it('propagates the error of the inner publisher', async () => {
    const { inner, publisher } = setup();
    inner.failing.add(envelope.id);

    await expect(publisher.publish(envelope, TOPIC, {})).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
    });
  });

  it('opens the circuit of a destination after five consecutive failures', async () => {
    const { inner, publisher } = setup();
    inner.failing.add(envelope.id);
    const failingPublish = () =>
      expect(publisher.publish(envelope, TOPIC, {})).rejects.toMatchObject({
        code: MessagingErrorCode.TransportFailed,
      });

    await failingPublish();
    await failingPublish();
    await failingPublish();
    await failingPublish();
    await failingPublish();

    await expect(publisher.publish(envelope, TOPIC, {})).rejects.toBeInstanceOf(
      CircuitOpenError,
    );
    expect(inner.attempts).toBe(5);
  });

  it('keeps publishing to a destination whose circuit is closed', async () => {
    const { inner, publisher } = setup();
    inner.failing.add(envelope.id);
    const failingPublish = () =>
      expect(publisher.publish(envelope, TOPIC, {})).rejects.toMatchObject({
        code: MessagingErrorCode.TransportFailed,
      });
    await failingPublish();
    await failingPublish();
    await failingPublish();
    await failingPublish();
    await failingPublish();
    inner.failing.clear();

    await publisher.publish(
      EnvelopeBuilder.anEnvelope({ id: 'msg-2' }),
      OTHER_QUEUE,
      {},
    );

    expect(inner.published.map((p) => p.target.name)).toEqual([
      'notifications',
    ]);
  });
});
