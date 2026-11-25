import { Compensation, defineOperation } from '@contracts/platform';
import { z } from 'zod';

/** Budget that fits within those of these tests: a 50 ms attempt and no retries. */
const FAST = {
  timeoutMs: 50,
  retry: { maxAttempts: 1, baseMs: 0, maxMs: 0 },
} as const;

const NameInput = z.looseObject({ name: z.string() });
const CreatedOutput = z.object({ id: z.string(), at: z.string() });

function creates(name: string) {
  return defineOperation({
    id: `${name}.create.v1`,
    input: NameInput,
    output: CreatedOutput,
    idempotent: true,
    compensatedBy: `${name}.remove.v1`,
    description: `Creates a ${name}.`,
    ...FAST,
  });
}

export const STEP_A = creates('a');
export const STEP_B = creates('b');
export const STEP_C = creates('c');

export const SEND = defineOperation({
  id: 'post.send.v1',
  input: NameInput,
  output: CreatedOutput,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'A sent post cannot be recalled.',
  description: 'Sends a post.',
  ...FAST,
});

export const LOOKUP = defineOperation({
  id: 'a.lookup.v1',
  input: z.object({}),
  output: z.object({}),
  idempotent: true,
  mutating: false,
  description: 'Reads, nothing to undo.',
  ...FAST,
});

export const LOOSE_A = defineOperation({
  id: 'a.create.v1',
  input: z.unknown(),
  output: CreatedOutput,
  idempotent: true,
  compensatedBy: 'a.remove.v1',
  description: 'Creates an a from any input.',
  ...FAST,
});
