import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { KernelErrorCode } from '@platform/kernel';

/**
 * Catalog of the kernel codes. It lives here because the kernel does not depend on
 * the contracts.
 */
export const kernelErrorCatalog = defineErrorCatalog(KernelErrorCode, {
  [KernelErrorCode.InvalidId]: ErrorSpecs.pub(
    400,
    false,
    'El identificador no tiene un formato válido.',
  ),
  [KernelErrorCode.GuardViolation]: ErrorSpecs.internal(
    500,
    false,
    'Un argumento no cumple el rango o el tipo esperado.',
  ),
  [KernelErrorCode.InvalidTenantId]: ErrorSpecs.pub(
    400,
    false,
    'El identificador del tenant no es válido.',
  ),
  [KernelErrorCode.InvalidMoney]: ErrorSpecs.pub(
    400,
    false,
    'El monto o la moneda no son válidos.',
  ),
});
