import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { BillingErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;

/** Catálogo de los códigos de billing. */
export const billingErrorCatalog = defineErrorCatalog(C, {
  [C.SubscriptionNotFound]: pub(
    404,
    false,
    'El tenant no tiene una suscripción.',
  ),
  [C.SubscriptionNotChangeable]: pub(
    409,
    false,
    'La suscripción está suspendida o cancelada y no admite cambio de plan.',
  ),
  [C.PlanNotAvailable]: pub(
    404,
    false,
    'El plan no existe o no está disponible para este tenant.',
  ),
  [C.PlanUsageExceedsLimit]: pub(
    409,
    false,
    'El uso actual supera un límite del plan nuevo: no se puede bajar a ese plan.',
  ),
  [C.InvoiceNotFound]: pub(404, false, 'La factura no existe en el tenant.'),
  [C.InvoiceInvalidState]: pub(
    409,
    false,
    'La factura no está en un estado que admita la operación pedida.',
  ),
  [C.InvoiceAmountMismatch]: pub(
    422,
    false,
    'Lo pagado no coincide con el total de la factura en su moneda. Los detalles traen expected y received.',
  ),
  [C.QuotaExceeded]: pub(
    403,
    false,
    'Se alcanzó la cuota del plan. Los detalles traen metric, limit y used.',
  ),
});
