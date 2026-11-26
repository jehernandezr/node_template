import type { ConfigSection } from './config-section.js';

/**
 * Already validated, immutable configuration. It is the only read point: nobody
 * else touches `process.env`.
 */
export abstract class AppConfig {
  /**
   * Returns the values of a section. Fails with `ConfigValidationError` if the environment does not satisfy it.
   * @param section Section to read.
   * @returns Its values.
   */
  abstract get<T>(section: ConfigSection<T>): T;

  /**
   * Returns the values of the service's own schema (`ConfigModule.forRoot({ schema })`).
   * @returns The values of the root schema.
   */
  abstract root<T = unknown>(): T;
}
