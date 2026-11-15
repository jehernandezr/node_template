import { TopicDef } from '../topic-def.js';

describe('TopicDef', () => {
  it('is a standard topic with the given name by default', () => {
    expect(new TopicDef('tasks-events')).toMatchObject({
      name: 'tasks-events',
      fifo: false,
    });
  });

  it('is a FIFO topic when the option says so', () => {
    expect(new TopicDef('ledger-events', { fifo: true }).fifo).toBe(true);
  });
});
