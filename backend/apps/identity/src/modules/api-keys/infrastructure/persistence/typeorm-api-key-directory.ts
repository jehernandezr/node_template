import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { CatalogTableRepository } from '../../../../database/catalog-table-repository.js';
import { ApiKeyDirectory } from '../../domain/api-key-store.js';
import { ApiKeyLookupEntity } from './entities/api-key-lookup.entity.js';

/** `ApiKeyDirectory` sobre `api_key_lookup` del catálogo. */
@Injectable()
export class TypeOrmApiKeyDirectory
  extends CatalogTableRepository
  implements ApiKeyDirectory
{
  constructor(catalog: CatalogDataSource) {
    super(catalog);
  }

  async register(
    prefix: string,
    tenantId: string,
    region: string,
  ): Promise<void> {
    await this.write((manager) =>
      manager.insert(ApiKeyLookupEntity, { prefix, tenantId, region }),
    );
  }

  async tenantOf(prefix: string): Promise<string | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(ApiKeyLookupEntity, { prefix }),
    );
    return row?.tenantId;
  }

  async relocateTenant(tenantId: string, region: string): Promise<void> {
    await this.write((manager) =>
      manager.update(ApiKeyLookupEntity, { tenantId }, { region }),
    );
  }
}
