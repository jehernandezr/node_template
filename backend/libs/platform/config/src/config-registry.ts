import type { ConfigSection } from './config-section.js';

/**
 * Already validated values of each section and of the service's own schema.
 * Only startup writes to it; `AppConfig` reads it.
 */
export class ConfigRegistry {
  private readonly sections = new Map<string, unknown>();
  private rootValue: unknown;

  /**
   * Stores the values of `section`. Registering the same section twice keeps the first value.
   * @param section Loaded section.
   * @param value Its values.
   */
  register<T>(section: ConfigSection<T>, value: T): void {
    if (this.sections.has(section.name)) {
      return;
    }
    this.sections.set(section.name, ConfigRegistry.freeze(value));
  }

  /**
   * Returns the values of `section`, or `undefined` if not loaded yet.
   * @param section Section to read.
   * @returns Its values, or `undefined`.
   */
  find<T>(section: ConfigSection<T>): T | undefined {
    return this.sections.get(section.name) as T | undefined;
  }

  /**
   * Stores the values of the service's root schema.
   * @param value Root values.
   */
  setRoot(value: unknown): void {
    this.rootValue = ConfigRegistry.freeze(value);
  }

  /**
   * Reads the values of the service's root schema.
   * @returns The root values.
   */
  root(): unknown {
    return this.rootValue;
  }

  /** Freezes the objects so nobody alters the configuration after validating it. */
  private static freeze<T>(value: T): T {
    return typeof value === 'object' && value !== null
      ? Object.freeze(value)
      : value;
  }
}
