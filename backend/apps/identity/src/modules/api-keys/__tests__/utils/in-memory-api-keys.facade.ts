import { ApiKeysFacade } from '../../application/api-keys.facade.js';

/** La fachada de API keys en memoria: recuerda a qué región se apuntaron los prefijos de cada tenant. */
export class InMemoryApiKeysFacade extends ApiKeysFacade {
  private readonly regions = new Map<string, string>();

  async relocateTenant(tenantId: string, region: string): Promise<void> {
    this.regions.set(tenantId, region);
  }

  regionOfTenant(tenantId: string): string | undefined {
    return this.regions.get(tenantId);
  }
}
