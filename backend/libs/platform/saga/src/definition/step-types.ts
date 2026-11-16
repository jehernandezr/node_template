import type { OperationDefinition } from '@contracts/platform';
import type { z } from 'zod';

/** Entrada que un paso construye para una operación: lo que el cliente acepta. */
export type StepInputOf<D extends OperationDefinition> = z.input<D['input']>;

/** Salida que un paso recibe de una operación: la salida ya parseada. */
export type StepOutputOf<D extends OperationDefinition> = z.output<D['output']>;
