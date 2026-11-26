import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { ReportTenants } from '../domain/report-tenants.js';

/** The active tenants in the shard directory of the service catalog. */
@Injectable()
export class DirectoryReportTenants extends ReportTenants {
  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  override async active(): Promise<readonly string[]> {
    const dataSource = await this.catalog.get();
    const rows: { tenant_id: string }[] = await dataSource.query(
      `SELECT "tenant_id" FROM "shard_directory" WHERE "status" = 'active' ORDER BY "tenant_id"`,
    );
    return rows.map((row) => row.tenant_id);
  }
}
