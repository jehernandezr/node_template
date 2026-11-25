import type { AppConfig } from './app-config.js';

/**
 * The validated values of a service's own schema, typed once in the service's `config/` folder. Use cases and adapters
 * inject the service's subclass instead of `AppConfig`, so the cast to the schema type lives in a single place.
 */
export abstract class RootSettings<T> {
  /** The values of the root schema that `ConfigModule.forRoot({ schema })` validated at startup. */
  readonly values: T;

  protected constructor(config: AppConfig) {
    this.values = config.root<T>();
  }
}
