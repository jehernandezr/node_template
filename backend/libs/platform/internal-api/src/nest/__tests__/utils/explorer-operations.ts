import { defineOperation } from '@contracts/platform';
import { z } from 'zod';

/** Operations of the `stock` service and a remote one from `billing` used by the explorer tests. */
export class ExplorerOperations {
  static readonly Count = defineOperation({
    id: 'stock.count.v1',
    input: z.object({ sku: z.string() }),
    output: z.object({ total: z.number() }),
    idempotent: true,
    mutating: false,
    description: 'Counts stock.',
  });

  static readonly Echo = defineOperation({
    id: 'stock.echo.v1',
    input: z.object({ sku: z.string() }),
    output: z.object({ sku: z.string() }),
    idempotent: true,
    mutating: false,
    description: 'Echoes a sku.',
  });

  static readonly Remote = defineOperation({
    id: 'billing.invoice.get.v1',
    input: z.object({ invoiceId: z.string() }),
    output: z.object({ paid: z.boolean() }),
    idempotent: true,
    mutating: false,
    description: 'Reads an invoice from billing.',
  });
}
