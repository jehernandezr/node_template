/** Valor con un ciclo, que no es JSON canónico. */
export class CyclicValue {
  /** Objeto que se contiene a sí mismo. */
  static params(): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    params.self = params;
    return params;
  }
}
