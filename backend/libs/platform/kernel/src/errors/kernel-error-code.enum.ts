/**
 * Kernel error codes. The catalog with their HTTP status lives in
 * `@platform/primitives`, because the kernel does not depend on the contracts.
 */
export enum KernelErrorCode {
  InvalidId = 'PLATFORM.KERNEL.INVALID_ID',
  GuardViolation = 'PLATFORM.KERNEL.GUARD_VIOLATION',
  InvalidTenantId = 'PLATFORM.KERNEL.INVALID_TENANT_ID',
  InvalidMoney = 'PLATFORM.KERNEL.INVALID_MONEY',
}
