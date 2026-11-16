import { PlatformError } from '@platform/kernel';

/** Descripción corta de un error lanzado por código de servicio, sin valores de entrada. */
export class ErrorDetail {
  /** Más largo que esto se trunca, para que un mensaje enorme no infle la instancia. */
  static readonly MAX_LENGTH = 300;

  /**
   * Un error de plataforma da su código y mensaje, que por convención no
   * llevan valores de entrada; cualquier otro error da su nombre y mensaje.
   */
  static of(error: unknown): string {
    let text: string;
    if (PlatformError.is(error)) {
      text = `${error.code}: ${error.message}`;
    } else if (error instanceof Error) {
      text = `${error.name}: ${error.message}`;
    } else {
      text = `thrown ${typeof error}`;
    }
    return text.length > ErrorDetail.MAX_LENGTH
      ? `${text.slice(0, ErrorDetail.MAX_LENGTH - 1)}…`
      : text;
  }
}
