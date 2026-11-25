import { FailureKind } from '@platform/kernel';

/** Errors of a remote dependency with the shape the classifier recognizes. */
export class UpstreamErrors {
  /** Respuesta 503: transitoria. */
  static unavailable(): Error {
    return Object.assign(new Error('upstream down'), { status: 503 });
  }

  /** Respuesta 404: permanente. */
  static notFound(message = 'not found', cause?: unknown): Error {
    return Object.assign(new Error(message, { cause }), { status: 404 });
  }

  /** Error that declares its failure class as transient. */
  static declaredTransient(): Error {
    return Object.assign(new Error('declared transient'), {
      failureKind: FailureKind.Transient,
    });
  }
}
