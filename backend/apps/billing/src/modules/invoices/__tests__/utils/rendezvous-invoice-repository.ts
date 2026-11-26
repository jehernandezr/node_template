import type { InvoiceStatus } from '@contracts/billing';
import { InvoiceRepository } from '../../domain/invoice.repository.js';
import type { InvoicePageRequest } from '../../domain/invoice.repository.js';
import type { Invoice } from '../../domain/invoice.js';

/**
 * Real `InvoiceRepository` that, in `any`, makes each transaction wait until `parties` arrive or
 * `patienceMs` elapses. This way two concurrent payments read the failed invoices at the same time, the exact write skew
 * ordering, unless a lock lets only one through: then the first continues alone when the patience runs out.
 * `mostAtOnce` tells which of the two happened.
 */
export class RendezvousInvoiceRepository extends InvoiceRepository {
  private arrived = 0;
  private waiting = 0;
  private most = 0;
  private release: () => void = () => undefined;
  private readonly everyone = new Promise<void>((resolve) => {
    this.release = resolve;
  });

  constructor(
    private readonly inner: InvoiceRepository,
    private readonly parties: number,
    private readonly patienceMs: number,
  ) {
    super();
  }

  /** Inserts into the real repository. */
  override insert(invoice: Invoice): Promise<void> {
    return this.inner.insert(invoice);
  }

  /** Finds in the real repository. */
  override find(invoiceId: string): Promise<Invoice | undefined> {
    return this.inner.find(invoiceId);
  }

  /** Updates in the real repository. */
  override update(invoice: Invoice): Promise<void> {
    return this.inner.update(invoice);
  }

  /** Pages through the real repository. */
  override page(request: InvoicePageRequest): Promise<readonly Invoice[]> {
    return this.inner.page(request);
  }

  /** The most transactions that were inside `any` at the same moment: 1 when a lock let them through one by one. */
  get mostAtOnce(): number {
    return this.most;
  }

  /** Waits for the other transactions, or for the patience to run out, and queries the real repository. */
  override async any(status?: InvoiceStatus): Promise<boolean> {
    this.arrived += 1;
    this.waiting += 1;
    this.most = Math.max(this.most, this.waiting);
    if (this.arrived >= this.parties) {
      this.release();
    }
    let timer: NodeJS.Timeout | undefined;
    const patience = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, this.patienceMs);
    });
    try {
      await Promise.race([this.everyone, patience]);
    } finally {
      clearTimeout(timer);
      this.waiting -= 1;
    }
    return this.inner.any(status);
  }
}
