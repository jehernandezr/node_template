import { ActingMember } from '@platform/auth';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import {
  GetInvoiceRoute,
  ListInvoicesRoute,
  type GetInvoiceRequest,
  type Invoice,
  type InvoicePage,
  type ListInvoicesRequest,
} from '@contracts/billing';
import { BillingResource } from '../../../shared/enums/billing-resource.enum.js';
import { InvoiceQueries } from '../application/invoice-queries.js';

/** HTTP routes of the invoices of the actor's tenant. */
@Resource(BillingResource.Invoices)
export class InvoicesController {
  constructor(private readonly queries: InvoiceQueries) {}

  /**
   * Lists the invoices of the actor's tenant.
   * @param input Cursor and page size.
   * @param actor Signed-in actor; its tenant is read.
   * @returns One page of invoices.
   */
  @Endpoint(ListInvoicesRoute)
  list(
    @Input() input: ListInvoicesRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<InvoicePage> {
    return this.queries.list(ActingMember.of(actor).tenantId, input);
  }

  /**
   * Reads one invoice of the actor's tenant.
   * @param input Invoice id.
   * @param actor Signed-in actor; its tenant is read.
   * @returns The invoice with its lines.
   */
  @Endpoint(GetInvoiceRoute)
  get(
    @Input() input: GetInvoiceRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Invoice> {
    return this.queries.get(ActingMember.of(actor).tenantId, input.invoiceId);
  }
}
