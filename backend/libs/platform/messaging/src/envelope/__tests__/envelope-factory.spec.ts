import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { EnvelopeFactory } from '../envelope-factory.js';
import type { CreateEnvelopeInput } from '../create-envelope-input.js';

const NOW = new Date('2026-01-02T03:04:05.000Z');
const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

function factory(): EnvelopeFactory {
  return new EnvelopeFactory(new FixedClock(NOW), new SequentialIdGenerator());
}

const bareInput: CreateEnvelopeInput<{ id: string }> = {
  type: 'tasks.task.updated.v1',
  source: '/services/tasks',
  data: { id: 't1' },
};

describe('EnvelopeFactory', () => {
  it('builds a CloudEvents 1.0 envelope with the id and time it was given', () => {
    expect(factory().create(bareInput)).toEqual({
      specversion: '1.0',
      id: expect.any(String),
      type: 'tasks.task.updated.v1',
      source: '/services/tasks',
      time: NOW.toISOString(),
      datacontenttype: 'application/json',
      data: { id: 't1' },
    });
  });

  it('takes the id from the id generator, one per envelope', () => {
    const envelopeFactory = factory();

    expect(envelopeFactory.create(bareInput).id).not.toBe(
      envelopeFactory.create(bareInput).id,
    );
  });

  it.each([
    ['subject', { subject: 'task-1' }, { subject: 'task-1' }],
    ['traceparent', { traceparent }, { traceparent }],
    ['tenant', { tenantId: 'tenant-1' }, { tenantid: 'tenant-1' }],
    ['actor', { actorId: 'actor-1' }, { actorid: 'actor-1' }],
  ])('maps the %s attribute when it is given', (_label, optional, expected) => {
    expect(factory().create({ ...bareInput, ...optional })).toMatchObject(
      expected,
    );
  });

  it('omits the optional attributes that were not given', () => {
    expect(Object.keys(factory().create(bareInput))).toEqual([
      'specversion',
      'id',
      'type',
      'source',
      'time',
      'datacontenttype',
      'data',
    ]);
  });
});
