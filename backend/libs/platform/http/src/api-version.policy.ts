import { HttpLimits } from './http-limits.js';
import { HttpProblemError } from './http-problem.error.js';

/** Resuelve la versión de la API de una petición: `Api-Version` con formato de fecha y versión soportada. */
export class ApiVersionPolicy {
  private static readonly FORMAT = /^\d{4}-\d{2}-\d{2}$/;

  constructor(
    private readonly supported: readonly string[] = [
      HttpLimits.CURRENT_API_VERSION,
    ],
    private readonly current: string = HttpLimits.CURRENT_API_VERSION,
  ) {}

  /**
   * @throws HttpProblemError (`PLATFORM.API.UNSUPPORTED_VERSION`) si el header es inválido, repetido o no soportado.
   */
  resolve(header: string | string[] | undefined, pinned?: string): string {
    if (header === undefined) {
      return pinned !== undefined && this.supported.includes(pinned)
        ? pinned
        : this.current;
    }
    if (
      Array.isArray(header) ||
      !ApiVersionPolicy.FORMAT.test(header) ||
      !this.supported.includes(header)
    ) {
      throw HttpProblemError.unsupportedVersion(String(header));
    }
    return header;
  }

  /** @throws HttpProblemError si la ruta declara versiones y no incluye la pedida. */
  assertAccepts(version: string, routeVersions?: readonly string[]): void {
    if (routeVersions !== undefined && !routeVersions.includes(version)) {
      throw HttpProblemError.unsupportedVersion(version);
    }
  }
}
