import { Compensation, defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  CreateTenantInputSchema,
  SuspendTenantInputSchema,
  TenantOperationResultSchema,
  TenantRefInputSchema,
  TenantSummarySchema,
} from '../schemas/tenant.schema.js';

/**
 * Crea un tenant en aprovisionamiento. Su reversa lo descarta, así que la
 * saga no deja tenants a medias si falla después.
 */
export const CreateTenantOperation = defineOperation({
  id: IdentityOperation.CreateTenant,
  input: CreateTenantInputSchema,
  output: TenantSummarySchema,
  idempotent: true,
  compensatedBy: IdentityOperation.DiscardTenant,
  errors: [IdentityErrorCode.TenantSlugTaken],
  timeoutMs: 3000,
  description: 'Crea un tenant en aprovisionamiento con su dueño.',
});

/**
 * Descarta un tenant que nunca quedó activo. No se revierte: el tenant nunca
 * tuvo datos de negocio que recuperar.
 */
export const DiscardTenantOperation = defineOperation({
  id: IdentityOperation.DiscardTenant,
  input: TenantRefInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Solo borra un tenant en aprovisionamiento, que no tiene datos de negocio que restaurar.',
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Descarta un tenant en aprovisionamiento.',
});

/** Suspende un tenant. Su reversa lo reactiva. */
export const SuspendTenantOperation = defineOperation({
  id: IdentityOperation.SuspendTenant,
  input: SuspendTenantInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.ReactivateTenant,
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Suspende un tenant y revoca sus tokens.',
});

/** Reactiva un tenant suspendido. Su reversa lo vuelve a suspender. */
export const ReactivateTenantOperation = defineOperation({
  id: IdentityOperation.ReactivateTenant,
  input: TenantRefInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.SuspendTenant,
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Reactiva un tenant suspendido.',
});
