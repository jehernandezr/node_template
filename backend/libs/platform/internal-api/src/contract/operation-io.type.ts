import type { OperationDefinition } from '@contracts/platform';
import type { z } from 'zod';

/** Lo que quien llama pasa como entrada, antes de parsearla. */
export type CallInputOf<S extends OperationDefinition> = z.input<S['input']>;

/** Lo que recibe un handler: la entrada ya parseada. */
export type HandlerInputOf<S extends OperationDefinition> = z.output<
  S['input']
>;

/** Salida de una operación, tal como la devuelve un handler y la entrega el cliente. */
export type OperationOutputOf<S extends OperationDefinition> = z.output<
  S['output']
>;
