import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { ReportTenants } from '../domain/report-tenants.js';

/** Los tenants activos del directorio de shards del catálogo del servicio. */
@Injectable()
export class DirectoryReportTenants extends ReportTenants {
  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  async active(): Promise<readonly string[]> {
    const dataSource = await this.catalog.get();
    const rows: { tenant_id: string }[] = await dataSource.query(
      `SELECT "tenant_id" FROM "shard_directory" WHERE "status" = 'active' ORDER BY "tenant_id"`,
    );
    return rows.map((row) => row.tenant_id);
  }
}
