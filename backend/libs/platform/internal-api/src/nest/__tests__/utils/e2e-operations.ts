import { defineOperation } from '@contracts/platform';
import { z } from 'zod';

/** Operations of the end-to-end flow between two internal API modules. */
export class E2eOperations {
  static readonly Greet = defineOperation({
    id: 'greeter.messages.greet.v1',
    idempotent: true,
    mutating: false,
    description: 'Greets a person',
    input: z.object({ name: z.string().min(1) }),
    output: z.object({ greeting: z.string() }),
  });

  static readonly Flaky = defineOperation({
    id: 'greeter.messages.flaky.v1',
    idempotent: true,
    mutating: false,
    description: 'Fails once, then answers',
    timeoutMs: 2000,
    retry: { maxAttempts: 3, baseMs: 1, maxMs: 2 },
    input: z.object({}),
    output: z.object({ attempts: z.number() }),
  });
}
