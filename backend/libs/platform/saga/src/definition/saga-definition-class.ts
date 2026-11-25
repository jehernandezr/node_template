import type { SagaDefinition } from './saga-definition.js';

/** Concrete class of a saga definition, with the state it starts with. */
export type SagaDefinitionClass<TState> = abstract new (
  ...args: never[]
) => SagaDefinition<TState>;
