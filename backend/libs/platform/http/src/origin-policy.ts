/** Allowed origins for the `Origin` header, compared in normalized form. */
export class OriginPolicy {
  private readonly allowed: ReadonlySet<string>;

  constructor(allowed: readonly string[]) {
    const normalized = allowed
      .map((origin) => OriginPolicy.normalize(origin))
      .filter((origin): origin is string => origin !== undefined);
    this.allowed = new Set(normalized);
  }

  /**
   * Tells whether a browser origin may call the API.
   * Without `Origin` the request does not come from a browser and is accepted.
   * @param origin `Origin` header.
   * @returns `true` when allowed.
   */
  isAllowed(origin: string | undefined): boolean {
    if (origin === undefined) {
      return true;
    }
    const normalized = OriginPolicy.normalize(origin);
    return normalized !== undefined && this.allowed.has(normalized);
  }

  /** `scheme://host` in lowercase, without a trailing slash. `undefined` if it does not parse. */
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
