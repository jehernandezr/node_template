import { FailureKind } from '@platform/kernel';
import { FailureRule } from '@platform/primitives';

/** Test rule shaped like the Postgres one: a lost-connection SQLSTATE is transient. */
export class SqlStateFailureRule extends FailureRule {
  constructor(private readonly transient: ReadonlySet<string>) {
    super();
  }

  /** Returns `Transient` for an error with one of the given SQLSTATEs. */
  classify(error: object): FailureKind | undefined {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' && this.transient.has(code)
      ? FailureKind.Transient
      : undefined;
  }
}
