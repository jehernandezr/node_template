import type { OperationDefinition } from '@contracts/platform';
import type { z } from 'zod';

/** Input that a step builds for an operation: what the client accepts. */
export type StepInputOf<D extends OperationDefinition> = z.input<D['input']>;

/** Output that a step receives from an operation: the already parsed output. */
export type StepOutputOf<D extends OperationDefinition> = z.output<D['output']>;
