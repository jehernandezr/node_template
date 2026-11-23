import { Endpoint, Resource } from '@platform/http/nest';
import { ListCatalogRoute, type ReportCatalog } from '@contracts/reports';
import { ReportsResource } from '../../../shared/enums/reports-resource.enum.js';
import { ReportDefinitionRegistry } from '../application/report-definition-registry.js';

@Resource(ReportsResource.Catalog)
export class CatalogController {
  constructor(private readonly registry: ReportDefinitionRegistry) {}

  @Endpoint(ListCatalogRoute)
  list(): ReportCatalog {
    return {
      items: this.registry.all().map((definition) => definition.entry()),
    };
  }
}
