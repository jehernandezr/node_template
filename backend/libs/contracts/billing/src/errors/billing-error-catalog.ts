import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { BillingErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;

/** Catalog of the billing codes. */
export const billingErrorCatalog = defineErrorCatalog(C, {
  [C.SubscriptionNotFound]: pub(404, false, 'The tenant has no subscription.'),
  [C.SubscriptionNotChangeable]: pub(
    409,
    false,
    'The subscription is suspended or cancelled and does not allow a plan change.',
  ),
  [C.PlanNotAvailable]: pub(
    404,
    false,
    'The plan does not exist or is not available for this tenant.',
  ),
  [C.PlanUsageExceedsLimit]: pub(
    409,
    false,
    'Current usage exceeds a limit of the new plan: cannot downgrade to that plan.',
  ),
  [C.InvoiceNotFound]: pub(
    404,
    false,
    'The invoice does not exist in the tenant.',
  ),
  [C.InvoiceInvalidState]: pub(
    409,
    false,
    'The invoice is not in a state that allows the requested operation.',
  ),
  [C.InvoiceAmountMismatch]: pub(
    422,
    false,
    'The amount paid does not match the invoice total in its currency. The details carry expected and received.',
  ),
  [C.QuotaExceeded]: pub(
    403,
    false,
    'The plan quota was reached. The details carry metric, limit and used.',
  ),
});
