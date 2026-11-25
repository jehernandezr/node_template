/** Whether the tenant's plan includes advanced reports (CSV export) for the requester. */
export abstract class ReportEntitlements {
  abstract allowsAdvancedReports(
    tenantId: string,
    userId: string,
  ): Promise<boolean>;
}
