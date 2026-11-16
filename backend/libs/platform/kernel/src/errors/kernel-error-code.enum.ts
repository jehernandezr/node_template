/**
 * Códigos de error del kernel. El catálogo con su estado HTTP vive en
 * `@platform/primitives`, porque el kernel no depende de los contratos.
 */
export enum KernelErrorCode {
  InvalidId = 'PLATFORM.KERNEL.INVALID_ID',
  GuardViolation = 'PLATFORM.KERNEL.GUARD_VIOLATION',
  InvalidTenantId = 'PLATFORM.KERNEL.INVALID_TENANT_ID',
  InvalidMoney = 'PLATFORM.KERNEL.INVALID_MONEY',
}
