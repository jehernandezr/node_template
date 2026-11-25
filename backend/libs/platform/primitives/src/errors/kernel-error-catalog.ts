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
    'The identifier does not have a valid format.',
  ),
  [KernelErrorCode.GuardViolation]: ErrorSpecs.internal(
    500,
    false,
    'An argument does not meet the expected range or type.',
  ),
  [KernelErrorCode.InvalidTenantId]: ErrorSpecs.pub(
    400,
    false,
    'The tenant identifier is not valid.',
  ),
  [KernelErrorCode.InvalidMoney]: ErrorSpecs.pub(
    400,
    false,
    'The amount or the currency is not valid.',
  ),
});
