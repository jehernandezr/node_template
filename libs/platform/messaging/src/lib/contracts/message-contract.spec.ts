import { z } from 'zod';
import {
  CommandContract,
  EventContract,
  MessageKind,
} from './message-contract.js';

class TaskUpdated extends EventContract<{ id: string }> {
  readonly type = 'tasks.task.updated.v1';
  readonly schema = z.object({ id: z.string() });
}

class GenerateReport extends CommandContract<{ reportId: string }> {
  readonly type = 'reports.generate.v1';
  readonly schema = z.object({ reportId: z.string() });
}

describe('message contracts', () => {
  it('marks events and commands with their kind', () => {
    expect(new TaskUpdated().kind).toBe(MessageKind.Event);
    expect(new GenerateReport().kind).toBe(MessageKind.Command);
  });

  it('validates payloads with the contract schema', () => {
    expect(new TaskUpdated().schema.safeParse({ id: 't1' }).success).toBe(true);
    expect(new TaskUpdated().schema.safeParse({ id: 1 }).success).toBe(false);
  });
});
