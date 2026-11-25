import { ResilienceGuard } from '../errors/resilience-guard.js';

/**
 * Name of a resilience policy. A value object instead of a
 * closed enum: the library ships `Cache` and `Database`, and each service creates its
 * own with `PolicyName.of` without editing the library.
 */
export class PolicyName {
  /** Shape of a name: lowercase letters, digits, dot, hyphen and underscore. */
  static readonly PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

  static readonly Cache = new PolicyName('cache');
  static readonly Database = new PolicyName('database');

  /** The service's own policy. Two names with the same `value` are the same policy. */
  static of(value: string): PolicyName {
    return new PolicyName(
      ResilienceGuard.instance.matches('name', value, PolicyName.PATTERN),
    );
  }

  private constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}
