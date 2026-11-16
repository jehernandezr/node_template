import type { RouteDefinition } from '@contracts/platform';
import { HttpHeader } from './http-header.enum.js';

/** Headers `Deprecation`, `Sunset` y `Link` de las rutas deprecadas del contrato. */
export class DeprecationHeaders {
  static forRoute(
    route: RouteDefinition,
    replacementPath?: string,
  ): Record<string, string> {
    const deprecated = route.deprecated;
    if (deprecated === undefined) {
      return {};
    }
    const headers: Record<string, string> = {
      [HttpHeader.Deprecation]: `@${Math.floor(DeprecationHeaders.startOf(deprecated.since) / 1000)}`,
      [HttpHeader.Sunset]: new Date(
        DeprecationHeaders.startOf(deprecated.sunset),
      ).toUTCString(),
    };
    if (replacementPath !== undefined) {
      headers[HttpHeader.Link] =
        `<${replacementPath}>; rel="successor-version"`;
    }
    return headers;
  }

  /** `true` desde las 00:00 UTC de la fecha de `sunset`. */
  static isSunset(route: RouteDefinition, now: Date): boolean {
    if (route.deprecated === undefined) {
      return false;
    }
    return now.getTime() >= DeprecationHeaders.startOf(route.deprecated.sunset);
  }

  private static startOf(date: string): number {
    return Date.parse(`${date}T00:00:00Z`);
  }
}
