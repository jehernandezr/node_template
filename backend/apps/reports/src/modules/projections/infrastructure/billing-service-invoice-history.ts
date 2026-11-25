import { Injectable } from '@nestjs/common';
import {
  ListInvoiceChangesOperation,
  type InvoiceChange,
} from '@contracts/billing';
import type { Page } from '@contracts/platform';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { PeerUnavailableError } from '../../../shared/errors/peer-unavailable.error.js';
import { InvoiceHistory } from '../domain/invoice-history.js';

/** Invoices through the `billing.invoices.list-changes.v1` operation. */
@Injectable()
export class BillingServiceInvoiceHistory extends InvoiceHistory {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws PeerUnavailableError if billing does not respond: the backfill continues on the next run. */
  async page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<InvoiceChange>> {
    const outcome = await this.client.call(
      ListInvoiceChangesOperation,
      { tenantId, limit, ...(after === undefined ? {} : { after }) },
      { idempotencyKey: this.ids.next().toString() },
    );
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new PeerUnavailableError(
        ListInvoiceChangesOperation.id,
        outcome.kind,
      );
    }
    return outcome.value;
  }
}
