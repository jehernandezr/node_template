import { AccessKind, type ServiceContract } from '@contracts/platform';
import type { RegisteredEndpoint } from './registered-endpoint.js';

/** Routes served by a handler, indexed by method and path and by contract id. */
export class HttpRouteRegistry {
  private readonly byRoute = new Map<string, RegisteredEndpoint>();
  private readonly byId = new Map<string, RegisteredEndpoint>();

  /**
   * @throws Error if the method and path are already registered, or if a public route declares `auth`.
   */
  register(entry: RegisteredEndpoint): void {
    const key = `${entry.route.method} ${entry.route.path}`;
    if (this.byRoute.has(key)) {
      throw new Error(`La ruta ${key} tiene más de un handler`);
    }
    if (
      entry.route.access.kind === AccessKind.Public &&
      entry.options.auth !== undefined
    ) {
      throw new Error(
        `La ruta pública ${entry.route.id} no puede declarar auth en @Endpoint`,
      );
    }
    this.byRoute.set(key, entry);
    this.byId.set(entry.route.id, entry);
  }

  /** @throws Error listing the contract routes without a handler and the handlers the contract does not have. */
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
      parts.push(`sin handler: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      parts.push(`fuera del contrato: ${extra.join(', ')}`);
    }
    throw new Error(
      `Las rutas no coinciden con el contrato (${parts.join('; ')})`,
    );
  }

  findByRouteId(id: string): RegisteredEndpoint | undefined {
    return this.byId.get(id);
  }

  pathOfRoute(id: string): string | undefined {
    return this.byId.get(id)?.route.path;
  }
}
