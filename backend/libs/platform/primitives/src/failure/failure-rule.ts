import type { FailureKind } from '@platform/kernel';

/**
 * Rule that an adapter registers to translate its provider's errors
 * (Postgres, AWS, Valkey) into a failure class.
 */
export abstract class FailureRule {
  /** Returns the failure class declared by `error`, or `undefined` if the rule says nothing. */
  abstract classify(error: object): FailureKind | undefined;
}
