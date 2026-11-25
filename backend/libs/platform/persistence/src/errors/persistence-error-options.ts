import type { FailureKind } from '@platform/kernel';

/** Options of a {@link PersistenceError}. */
export interface PersistenceErrorOptions {
  /** Diagnostic data. Never row values or statement parameters. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
  /** Failure class. Only `QueryFailed` takes it from here; the rest set it by code. */
  readonly failureKind?: FailureKind;
}
