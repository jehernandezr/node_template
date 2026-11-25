/** An invoice of some tenant, for the jobs that walk all shards. */
export interface TenantInvoice {
  readonly tenantId: string;
  readonly invoiceId: string;
}

/** Queries over the invoices of all tenants, across all shards, for the jobs. */
export abstract class InvoiceMaintenance {
  /**
   * Unpaid invoices whose charge is due: newly issued or with an overdue retry.
   * @param now Reference instant.
   * @returns The invoices of all shards, excluding tenants already moved.
   */
  abstract dueForCollection(now: Date): Promise<readonly TenantInvoice[]>;
}
