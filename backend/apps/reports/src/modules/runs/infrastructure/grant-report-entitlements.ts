import { Injectable } from '@nestjs/common';
import { PlanFeature } from '@contracts/identity';
import { AccessResolver } from '@platform/auth';
import { ReportEntitlements } from '../domain/report-entitlements.js';

/** The plan features identity leaves in the user's access in the tenant. */
@Injectable()
export class GrantReportEntitlements extends ReportEntitlements {
  constructor(private readonly access: AccessResolver) {
    super();
  }

  override async allowsAdvancedReports(
    tenantId: string,
    userId: string,
  ): Promise<boolean> {
    const grant = await this.access.resolve(tenantId, userId);
    return grant.features.includes(PlanFeature.AdvancedReports);
  }
}
