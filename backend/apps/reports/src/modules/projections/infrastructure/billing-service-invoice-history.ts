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

/** Las facturas por la operación `billing.invoices.list-changes.v1`. */
@Injectable()
export class BillingServiceInvoiceHistory extends InvoiceHistory {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws PeerUnavailableError si billing no responde: el relleno sigue en la próxima corrida. */
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
