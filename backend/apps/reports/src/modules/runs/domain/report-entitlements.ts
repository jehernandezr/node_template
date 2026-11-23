/** Si el plan del tenant incluye los reportes avanzados (exportar a CSV) para quien los pide. */
export abstract class ReportEntitlements {
  abstract allowsAdvancedReports(
    tenantId: string,
    userId: string,
  ): Promise<boolean>;
}
