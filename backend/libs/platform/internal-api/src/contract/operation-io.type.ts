import type { OperationDefinition } from '@contracts/platform';
import type { z } from 'zod';

/** What the caller passes as input, before it is parsed. */
export type CallInputOf<S extends OperationDefinition> = z.input<S['input']>;

/** What a handler receives: the already parsed input. */
export type HandlerInputOf<S extends OperationDefinition> = z.output<
  S['input']
>;

/** Output of an operation, as a handler returns it and the client delivers it. */
export type OperationOutputOf<S extends OperationDefinition> = z.output<
  S['output']
>;
