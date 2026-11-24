import { Injectable } from '@nestjs/common';
import { ApiKeyDirectory } from '../domain/api-key-store.js';
import { ApiKeysFacade } from './api-keys.facade.js';

/** `ApiKeysFacade` dentro del proceso. */
@Injectable()
export class LocalApiKeysFacade extends ApiKeysFacade {
  constructor(private readonly directory: ApiKeyDirectory) {
    super();
  }

  relocateTenant(tenantId: string, region: string): Promise<void> {
    return this.directory.relocateTenant(tenantId, region);
  }
}
