import { BillingErrorCode, billingErrorCatalog } from '@contracts/billing';
import type { ErrorCatalogEntry } from '@contracts/platform';

/** El código que responde un servicio que aplica cuotas; su texto y estado son los del contrato de billing. */
export const quotasErrorCatalog: readonly ErrorCatalogEntry[] =
  billingErrorCatalog.filter(
    (entry) => entry.code === BillingErrorCode.QuotaExceeded,
  );
