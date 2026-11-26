import { AccessKind, type ServiceContract } from '@contracts/platform';
import type { RegisteredEndpoint } from './registered-endpoint.js';

/** Routes served by a handler, indexed by method and path and by contract id. */
export class HttpRouteRegistry {
  private readonly byRoute = new Map<string, RegisteredEndpoint>();
  private readonly byId = new Map<string, RegisteredEndpoint>();

  /**
   * Registers a handler of a route.
   * @param entry Route and handler.
   * @throws Error if the method and path are already registered, or if a public route declares `auth`.
   */
  register(entry: RegisteredEndpoint): void {
    const key = `${entry.route.method} ${entry.route.path}`;
    if (this.byRoute.has(key)) {
      throw new Error(`Route ${key} has more than one handler`);
    }
    if (
      entry.route.access.kind === AccessKind.Public &&
      entry.options.auth !== undefined
    ) {
      throw new Error(
        `Public route ${entry.route.id} cannot declare auth in @Endpoint`,
      );
    }
    this.byRoute.set(key, entry);
    this.byId.set(entry.route.id, entry);
  }

  /**
   * Checks that every contract route has a handler and every handler a route.
   * @param contract Service contract.
   * @throws Error listing the contract routes without a handler and the handlers the contract does not have.
   */
  assertComplete(contract: ServiceContract): void {
    const contractIds = new Set(
      Object.values(contract.routes).map((route) => route.id),
    );
    const missing = [...contractIds].filter((id) => !this.byId.has(id)).sort();
    const extra = [...this.byId.keys()]
      .filter((id) => !contractIds.has(id))
      .sort();
    if (missing.length === 0 && extra.length === 0) {
      return;
    }
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(`no handler: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      parts.push(`outside the contract: ${extra.join(', ')}`);
    }
    throw new Error(`Routes do not match the contract (${parts.join('; ')})`);
  }

  /**
   * Finds a registered route by id.
   * @param id Route id.
   * @returns The entry, or `undefined`.
   */
  findByRouteId(id: string): RegisteredEndpoint | undefined {
    return this.byId.get(id);
  }

  /**
   * Finds the path of a route.
   * @param id Route id.
   * @returns The path, or `undefined`.
   */
  pathOfRoute(id: string): string | undefined {
    return this.byId.get(id)?.route.path;
  }
}
