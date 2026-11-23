import type { InvoiceStatus } from '@contracts/billing';
import type { Invoice } from './invoice.js';

/** Una página de facturas, de la más nueva a la más vieja. */
export interface InvoicePageRequest {
  readonly status?: InvoiceStatus;
  readonly afterId?: string;
  readonly limit: number;
}

/** Facturas del tenant del `ShardScope` abierto. */
export abstract class InvoiceRepository {
  abstract insert(invoice: Invoice): Promise<void>;
  abstract find(invoiceId: string): Promise<Invoice | undefined>;
  /** @throws OptimisticLockError si otra escritura la cambió desde que se leyó. */
  abstract update(invoice: Invoice): Promise<void>;
  abstract page(request: InvoicePageRequest): Promise<readonly Invoice[]>;
  /** Si el tenant tiene alguna factura emitida o, con `status`, alguna en ese estado. */
  abstract any(status?: InvoiceStatus): Promise<boolean>;
}
