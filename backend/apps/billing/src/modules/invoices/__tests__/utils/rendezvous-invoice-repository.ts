import type { InvoiceStatus } from '@contracts/billing';
import { InvoiceRepository } from '../../domain/invoice.repository.js';
import type { InvoicePageRequest } from '../../domain/invoice.repository.js';
import type { Invoice } from '../../domain/invoice.js';

/**
 * `InvoiceRepository` real que, en `any`, hace esperar a cada transacción hasta que lleguen `parties` o pase
 * `patienceMs`. Así dos pagos simultáneos leen las facturas fallidas a la vez, el orden exacto del write skew, salvo que
 * un candado deje pasar a una sola: entonces la primera sigue sola al vencer la paciencia.
 */
export class RendezvousInvoiceRepository extends InvoiceRepository {
  private arrived = 0;
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

  /** Inserta en el repositorio real. */
  insert(invoice: Invoice): Promise<void> {
    return this.inner.insert(invoice);
  }

  /** Busca en el repositorio real. */
  find(invoiceId: string): Promise<Invoice | undefined> {
    return this.inner.find(invoiceId);
  }

  /** Actualiza en el repositorio real. */
  update(invoice: Invoice): Promise<void> {
    return this.inner.update(invoice);
  }

  /** Pagina en el repositorio real. */
  page(request: InvoicePageRequest): Promise<readonly Invoice[]> {
    return this.inner.page(request);
  }

  /** Espera a las demás transacciones, o a que se acabe la paciencia, y consulta el repositorio real. */
  async any(status?: InvoiceStatus): Promise<boolean> {
    this.arrived += 1;
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
    }
    return this.inner.any(status);
  }
}
