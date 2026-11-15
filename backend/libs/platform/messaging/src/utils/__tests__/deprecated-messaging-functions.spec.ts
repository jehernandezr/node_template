import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { ProcessedMessageKey } from '../../dispatch/processed-message-key.js';
import {
  createEnvelope,
  processedMessageKey,
} from '../deprecated-messaging-functions.js';

const NOW = new Date('2026-01-02T03:04:05.000Z');

describe('createEnvelope', () => {
  it('takes the id and the time from the injected functions', () => {
    expect(
      createEnvelope(
        {
          type: 'tasks.task.updated.v1',
          source: '/services/tasks',
          data: { id: 't1' },
        },
        { newId: () => 'id-1', now: () => NOW },
      ),
    ).toEqual({
      specversion: '1.0',
      id: 'id-1',
      type: 'tasks.task.updated.v1',
      source: '/services/tasks',
      time: NOW.toISOString(),
      datacontenttype: 'application/json',
      data: { id: 't1' },
    });
  });

  it('takes the id and the time from the injected ids and clock', () => {
    expect(
      createEnvelope(
        { type: 't', source: 's', data: 1 },
        { ids: new SequentialIdGenerator(), clock: new FixedClock(NOW) },
      ),
    ).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      time: NOW.toISOString(),
    });
  });
});

describe('processedMessageKey', () => {
  it('equals the key of ProcessedMessageKey', () => {
    expect(processedMessageKey('audit', 'm1')).toBe(
      ProcessedMessageKey.of('audit', 'm1'),
    );
  });
});
