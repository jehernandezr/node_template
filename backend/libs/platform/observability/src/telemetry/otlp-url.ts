import type { OtlpPath } from './otlp-path.enum.js';

/** URL del exportador OTLP: el endpoint sin barras finales más la ruta de la señal. */
export class OtlpUrl {
  private static readonly SLASH = 0x2f;

  static of(endpoint: string, path: OtlpPath): string {
    // Quita las barras finales con un recorrido lineal; una regex /\/+$/ es
    // polinomial con muchas barras seguidas (CodeQL js/polynomial-redos).
    let end = endpoint.length;
    while (end > 0 && endpoint.charCodeAt(end - 1) === OtlpUrl.SLASH) {
      end -= 1;
    }
    return `${endpoint.slice(0, end)}/${path}`;
  }
}
