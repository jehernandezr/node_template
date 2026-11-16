import type { SagaDefinition } from './saga-definition.js';

/** Clase concreta de una definición de saga, con el estado que arranca. */
export type SagaDefinitionClass<TState> = abstract new (
  ...args: never[]
) => SagaDefinition<TState>;
