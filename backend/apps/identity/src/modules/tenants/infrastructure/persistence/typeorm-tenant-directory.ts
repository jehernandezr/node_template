import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { CatalogTableRepository } from '../../../../database/catalog-table-repository.js';
import { TenantDirectory } from '../../domain/tenant-directory.js';
import { TenantLookupEntity } from './entities/tenant-lookup.entity.js';

/** `TenantDirectory` sobre `tenant_lookup` del catálogo. */
@Injectable()
export class TypeOrmTenantDirectory
  extends CatalogTableRepository
  implements TenantDirectory
{
  constructor(catalog: CatalogDataSource) {
    super(catalog);
  }

  async reserve(
    slug: string,
    tenantId: string,
    region: string,
  ): Promise<boolean> {
    // El mismo tenant puede repetir la reserva: la operación de alta es idempotente.
    const inserted: unknown[] = await this.write((manager) =>
      manager.query(
        'INSERT INTO "tenant_lookup" ("slug", "tenant_id", "region") VALUES ($1, $2, $3) ' +
          'ON CONFLICT DO NOTHING RETURNING "tenant_id"',
        [slug, tenantId, region],
      ),
    );
    if (inserted.length > 0) {
      return true;
    }
    return (await this.slugOf(tenantId)) === slug;
  }

  async release(slug: string, tenantId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(TenantLookupEntity, { slug, tenantId }),
    );
  }

  isTaken(slug: string): Promise<boolean> {
    return this.read((manager) =>
      manager.existsBy(TenantLookupEntity, { slug }),
    );
  }

  async slugOf(tenantId: string): Promise<string | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(TenantLookupEntity, { tenantId }),
    );
    return row?.slug;
  }

  async relocate(tenantId: string, region: string): Promise<void> {
    await this.write((manager) =>
      manager.update(TenantLookupEntity, { tenantId }, { region }),
    );
  }
}
