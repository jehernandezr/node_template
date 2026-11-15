import { defineOperation } from '@contracts/platform';
import { z } from 'zod';

/** Operaciones del servicio `stock` y una remota de `billing` que usan las pruebas del explorador. */
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
