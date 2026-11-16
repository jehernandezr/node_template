import { FailureKind } from '@platform/kernel';

/** Errores de una dependencia remota con la forma que reconoce el clasificador. */
export class UpstreamErrors {
  /** Respuesta 503: transitoria. */
  static unavailable(): Error {
    return Object.assign(new Error('upstream down'), { status: 503 });
  }

  /** Respuesta 404: permanente. */
  static notFound(message = 'not found', cause?: unknown): Error {
    return Object.assign(new Error(message, { cause }), { status: 404 });
  }

  /** Error que declara su clase de falla como transitoria. */
  static declaredTransient(): Error {
    return Object.assign(new Error('declared transient'), {
      failureKind: FailureKind.Transient,
    });
  }
}
