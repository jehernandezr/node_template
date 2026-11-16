import { MessageKind } from '../../enums/message-kind.enum.js';
import { defineQueue } from '../define-messaging.js';
import {
  defineCommandReference,
  defineTopicReference,
} from '../define-reference.js';

describe('defineTopicReference', () => {
  const topic = defineTopicReference({
    name: 'other-events',
    events: ['other.thing.created.v1', 'other.thing.deleted.v1'],
    description: 'Eventos de otro servicio.',
  });

  it('builds a topic that names the events by type', () => {
    expect(topic.name).toBe('other-events');
    expect(topic.fifo).toBe(false);
    expect(topic.events.map((e) => e.type)).toEqual([
      'other.thing.created.v1',
      'other.thing.deleted.v1',
    ]);
    expect(topic.events.every((e) => e.kind === MessageKind.Event)).toBe(true);
  });

  it('can be subscribed to by a queue', () => {
    const queue = defineQueue({
      name: 'mine-other-events',
      subscriptions: [{ topic }],
      description: 'Eventos de otro servicio.',
    });
    expect(queue.subscriptions[0].topic).toBe(topic);
  });

  it('keeps the fifo flag', () => {
    expect(
      defineTopicReference({
        name: 'other-fifo',
        fifo: true,
        events: ['other.thing.created.v1'],
        description: 'Tópico FIFO.',
      }).fifo,
    ).toBe(true);
  });
});

describe('defineCommandReference', () => {
  it('builds a command that names the type', () => {
    const command = defineCommandReference({
      type: 'other.thing.record.v1',
      description: 'Registra algo.',
    });
    expect(command.type).toBe('other.thing.record.v1');
    expect(command.kind).toBe(MessageKind.Command);
    expect(command.version).toBe(1);
  });
});
