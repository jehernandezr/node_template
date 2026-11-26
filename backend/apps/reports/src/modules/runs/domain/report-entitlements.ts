/** Whether the tenant's plan includes advanced reports (CSV export) for the requester. */
export abstract class ReportEntitlements {
  /**
   * Tells whether the tenant's plan includes advanced reports for the user.
   * @param tenantId Tenant of the run.
   * @param userId User who requests it.
   * @returns `true` when included.
   */
  abstract allowsAdvancedReports(
    tenantId: string,
    userId: string,
  ): Promise<boolean>;
}
