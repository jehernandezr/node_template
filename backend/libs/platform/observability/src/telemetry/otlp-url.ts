import type { OtlpPath } from './otlp-path.enum.js';

/** OTLP exporter URL: the endpoint without trailing slashes plus the signal path. */
export class OtlpUrl {
  private static readonly SLASH = 0x2f;

  /**
   * Joins the OTLP endpoint and the signal path.
   * Strips trailing slashes with a linear scan; a /\/+$/ regex is polynomial with many consecutive slashes (CodeQL js/polynomial-redos).
   * @param endpoint Base endpoint.
   * @param path Signal path.
   * @returns The URL.
   */
  static of(endpoint: string, path: OtlpPath): string {
    let end = endpoint.length;
    while (end > 0 && endpoint.charCodeAt(end - 1) === OtlpUrl.SLASH) {
      end -= 1;
    }
    return `${endpoint.slice(0, end)}/${path}`;
  }
}
