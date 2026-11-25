import type { z } from 'zod';

/**
 * Named group of environment variables with a schema. Each library declares
 * its own and the service reads it with `AppConfig.get(section)`; this way a service does not
 * receive variables it does not use.
 */
export class ConfigSection<T> {
  /** The section's own token, so the wiring does not use loose strings. */
  readonly token: symbol;

  constructor(
    readonly name: string,
    readonly schema: z.ZodType<T>,
  ) {
    this.token = Symbol(`config.section.${name}`);
  }
}
