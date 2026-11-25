/** Value with a cycle, which is not canonical JSON. */
export class CyclicValue {
  /** Object that contains itself. */
  static params(): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    params.self = params;
    return params;
  }
}
