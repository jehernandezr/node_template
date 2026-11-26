import type { OtlpPath } from './otlp-path.enum.js';

/** OTLP exporter URL: the endpoint without trailing slashes plus the signal path. */
export class OtlpUrl {
  private static readonly SLASH = 0x2f;

  /**
   * Strips trailing slashes with a linear scan; a /\/+$/ regex is polynomial with many consecutive slashes (CodeQL js/polynomial-redos).
   */
  static of(endpoint: string, path: OtlpPath): string {
    let end = endpoint.length;
    while (end > 0 && endpoint.charCodeAt(end - 1) === OtlpUrl.SLASH) {
      end -= 1;
    }
    return `${endpoint.slice(0, end)}/${path}`;
  }
}
