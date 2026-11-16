import { defineEvent } from '@contracts/platform';
import { z } from 'zod';
import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { HandlerRegistry, type PreparedDelivery } from '../handler-registry.js';
import { RecordingMessageHandler } from './utils/index.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({
    id: z.string().min(1),
    tags: z.array(z.string()).default([]),
  }),
  description: 'Mensaje de prueba.',
});

describe('HandlerRegistry', () => {
  it('finds the registration of a type after registering its handler', () => {
    const registry = new HandlerRegistry();
    registry.register(TaskUpdated, new RecordingMessageHandler().handle);

    expect(registry.find(TaskUpdated.type)).toEqual(
      expect.objectContaining({ prepare: expect.any(Function) }),
    );
  });

  it('rejects a second handler for the same type with DuplicateHandler', () => {
    const registry = new HandlerRegistry();
    registry.register(TaskUpdated, new RecordingMessageHandler().handle);

    expect(() =>
      registry.register(TaskUpdated, new RecordingMessageHandler().handle),
    ).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.DuplicateHandler }),
    );
  });

  it('finds nothing for a type that no handler serves', () => {
    expect(new HandlerRegistry().find('unknown.type.v1')).toBeUndefined();
  });

  it('runs the handler with the payload as the contract parsed it', async () => {
    const registry = new HandlerRegistry();
    const handler = new RecordingMessageHandler();
    registry.register(TaskUpdated, handler.handle);
    const envelope = EnvelopeBuilder.anEnvelope({
      type: TaskUpdated.type,
      data: { id: 't1' },
    });

    const prepared = registry
      .find(TaskUpdated.type)
      ?.prepare(envelope) as PreparedDelivery;
    await prepared.run();

    expect(prepared.envelope).toMatchObject({ data: { id: 't1', tags: [] } });
    expect(handler.calls).toEqual([
      expect.objectContaining({ data: { id: 't1', tags: [] } }),
    ]);
  });

  it('returns the validation message for a payload the contract rejects, without running the handler', () => {
    const registry = new HandlerRegistry();
    const handler = new RecordingMessageHandler();
    registry.register(TaskUpdated, handler.handle);
    const envelope = EnvelopeBuilder.anEnvelope({
      type: TaskUpdated.type,
      data: { id: '' },
    });

    const prepared = registry.find(TaskUpdated.type)?.prepare(envelope);

    expect(prepared).toEqual(expect.stringContaining('"id"'));
    expect(handler.calls).toEqual([]);
  });
});
