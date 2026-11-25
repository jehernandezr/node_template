/** HTTP path of the internal operations. */
export class InternalApiRoute {
  /** Controller prefix, without a leading slash. */
  static readonly BASE = 'internal/operations';

  /** Returns the full path of an operation, with a leading slash. It is what gets signed. */
  static pathOf(operationId: string): string {
    return `/${InternalApiRoute.BASE}/${encodeURIComponent(operationId)}`;
  }
}
