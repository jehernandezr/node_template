import { BillingErrorCode, billingErrorCatalog } from '@contracts/billing';
import type { ErrorCatalogEntry } from '@contracts/platform';

/** The code returned by a service that enforces quotas; its text and status are those of the billing contract. */
export const quotasErrorCatalog: readonly ErrorCatalogEntry[] =
  billingErrorCatalog.filter(
    (entry) => entry.code === BillingErrorCode.QuotaExceeded,
  );
