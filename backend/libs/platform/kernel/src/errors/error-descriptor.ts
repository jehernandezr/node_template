import { ErrorCode } from './error-code.js';

/** Datos de un error que son seguros de registrar: sin causa, detalles ni pila. */
export interface ErrorDescription {
  readonly name: string;
  readonly code?: string;
  readonly message: string;
}

/**
 * Describe cualquier valor lanzado. Es estática porque no tiene estado ni
 * dependencias, y la comparten el registro de logs, las métricas y el
 * despachador de mensajes.
 */
export class ErrorDescriptor {
  /** Nombre, código válido y mensaje de `error`; un valor que no es `Error` se convierte a texto. */
  static describe(error: unknown): ErrorDescription {
    if (error instanceof Error) {
      const code = ErrorDescriptor.codeOf(error);
      return code === undefined
        ? { name: error.name, message: error.message }
        : { name: error.name, code, message: error.message };
    }
    return { name: typeof error, message: String(error) };
  }

  /** El `code` del error solo si cumple `ErrorCode.isValid`; si no, `undefined`. */
  static codeOf(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }
    const code = (error as { code?: unknown }).code;
    return ErrorCode.isValid(code) ? code : undefined;
  }
}
