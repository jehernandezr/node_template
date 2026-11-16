/** Orígenes permitidos para el header `Origin`, comparados en forma normalizada. */
export class OriginPolicy {
  private readonly allowed: ReadonlySet<string>;

  constructor(allowed: readonly string[]) {
    const normalized = allowed
      .map((origin) => OriginPolicy.normalize(origin))
      .filter((origin): origin is string => origin !== undefined);
    this.allowed = new Set(normalized);
  }

  /** Sin `Origin` la petición no viene de un navegador y se acepta. */
  isAllowed(origin: string | undefined): boolean {
    if (origin === undefined) {
      return true;
    }
    const normalized = OriginPolicy.normalize(origin);
    return normalized !== undefined && this.allowed.has(normalized);
  }

  /** `esquema://host` en minúsculas, sin barra final. `undefined` si no parsea. */
  private static normalize(origin: string): string | undefined {
    const trimmed = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    try {
      const url = new URL(trimmed);
      return `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}`;
    } catch {
      return undefined;
    }
  }
}
