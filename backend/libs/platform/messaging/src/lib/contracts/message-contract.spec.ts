import {
  MessageKind as KitMessageKind,
  defineCommand,
  defineEvent,
} from '@contracts/platform';
import { z } from 'zod';
import { MessageKind } from './message-contract.js';

const TaskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: z.object({ id: z.string() }),
  description: 'Una tarea cambió.',
});

const GenerateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: z.object({ reportId: z.string() }),
  description: 'Genera un reporte.',
});

describe('message contracts', () => {
  it('re-exports the kit MessageKind, so both packages share one enum', () => {
    expect(MessageKind).toBe(KitMessageKind);
  });

  it('marks events and commands with their kind', () => {
    expect(TaskUpdated.kind).toBe(MessageKind.Event);
    expect(GenerateReport.kind).toBe(MessageKind.Command);
  });

  it('validates payloads with the contract schema', () => {
    expect(TaskUpdated.schema.safeParse({ id: 't1' }).success).toBe(true);
    expect(TaskUpdated.schema.safeParse({ id: 1 }).success).toBe(false);
  });
});
