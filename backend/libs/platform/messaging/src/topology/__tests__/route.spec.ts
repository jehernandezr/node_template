import { defineCommand, defineEvent } from '@contracts/platform';
import { z } from 'zod';
import { MessageKind } from '../../contracts/message-contract.js';
import { QueueDef } from '../queue-def.js';
import { Route } from '../route.js';
import { TargetKind } from '../target-kind.enum.js';
import { TopicDef } from '../topic-def.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string() }),
  description: 'Mensaje de prueba.',
});

const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Mensaje de prueba.',
});

describe('Route', () => {
  it('routes an event contract to a topic, keeping the contract', () => {
    const topic = new TopicDef('tasks-events');

    expect(Route.event(TaskUpdated).to(topic)).toMatchObject({
      kind: MessageKind.Event,
      type: TaskUpdated.type,
      target: topic,
      targetKind: TargetKind.Topic,
      contract: TaskUpdated,
    });
  });

  it('routes a command contract to a queue, keeping the contract', () => {
    const queue = new QueueDef('reports').deadLetter({ maxReceiveCount: 5 });

    expect(Route.command(GenerateReport).to(queue)).toMatchObject({
      kind: MessageKind.Command,
      type: GenerateReport.type,
      target: queue,
      targetKind: TargetKind.Queue,
      contract: GenerateReport,
    });
  });

  it('keeps no contract when the route is declared with a bare type', () => {
    const route = Route.event('tasks.task.updated.v1').to(
      new TopicDef('tasks-events'),
    );

    expect(route.contract).toBeNull();
  });

  it('is FIFO when its target is a FIFO topic or queue', () => {
    expect(
      Route.event(TaskUpdated).to(
        new TopicDef('ordered-events', { fifo: true }),
      ).fifo,
    ).toBe(true);
    expect(
      Route.command(GenerateReport).to(
        new QueueDef('reports').fifo().deadLetter({ maxReceiveCount: 5 }),
      ).fifo,
    ).toBe(true);
    expect(Route.event(TaskUpdated).to(new TopicDef('tasks-events')).fifo).toBe(
      false,
    );
  });
});
