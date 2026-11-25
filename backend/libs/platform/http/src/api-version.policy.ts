import { HttpLimits } from './http-limits.js';
import { HttpProblemError } from './http-problem.error.js';

/** Resolves the API version of a request: `Api-Version` with date format and a supported version. */
export class ApiVersionPolicy {
  private static readonly FORMAT = /^\d{4}-\d{2}-\d{2}$/;

  constructor(
    private readonly supported: readonly string[] = [
      HttpLimits.CURRENT_API_VERSION,
    ],
    private readonly current: string = HttpLimits.CURRENT_API_VERSION,
  ) {}

  /**
   * @throws HttpProblemError (`PLATFORM.API.UNSUPPORTED_VERSION`) if the header is invalid, repeated or unsupported.
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

  /** @throws HttpProblemError if the route declares versions and does not include the requested one. */
  assertAccepts(version: string, routeVersions?: readonly string[]): void {
    if (routeVersions !== undefined && !routeVersions.includes(version)) {
      throw HttpProblemError.unsupportedVersion(version);
    }
  }
}
