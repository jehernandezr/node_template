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

@Resource(BillingResource.Invoices)
export class InvoicesController {
  constructor(private readonly queries: InvoiceQueries) {}

  @Endpoint(ListInvoicesRoute)
  list(
    @Input() input: ListInvoicesRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<InvoicePage> {
    return this.queries.list(ActingMember.of(actor).tenantId, input);
  }

  @Endpoint(GetInvoiceRoute)
  get(
    @Input() input: GetInvoiceRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<Invoice> {
    return this.queries.get(ActingMember.of(actor).tenantId, input.invoiceId);
  }
}
