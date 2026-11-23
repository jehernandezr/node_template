import { Injectable } from '@nestjs/common';
import { PlanFeature } from '@contracts/identity';
import { AccessResolver } from '@platform/auth';
import { ReportEntitlements } from '../domain/report-entitlements.js';

/** Las funcionalidades del plan que identity deja en el acceso del usuario en el tenant. */
@Injectable()
export class GrantReportEntitlements extends ReportEntitlements {
  constructor(private readonly access: AccessResolver) {
    super();
  }

  async allowsAdvancedReports(
    tenantId: string,
    userId: string,
  ): Promise<boolean> {
    const grant = await this.access.resolve(tenantId, userId);
    return grant.features.includes(PlanFeature.AdvancedReports);
  }
}
