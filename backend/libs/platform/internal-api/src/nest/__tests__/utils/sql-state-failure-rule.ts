import { FailureKind } from '@platform/kernel';
import { FailureRule } from '@platform/primitives';

/** Regla de prueba con la forma de la de Postgres: un SQLSTATE de conexión perdida es pasajero. */
export class SqlStateFailureRule extends FailureRule {
  constructor(private readonly transient: ReadonlySet<string>) {
    super();
  }

  /** `Transient` para un error con uno de los SQLSTATE dados. */
  classify(error: object): FailureKind | undefined {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' && this.transient.has(code)
      ? FailureKind.Transient
      : undefined;
  }
}
