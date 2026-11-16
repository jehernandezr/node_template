import type { Page } from '@contracts/platform';
import type { TenantKind, TenantLifecycle } from '../enums/tenant.enum.js';

/**
 * Tenant visible para sus miembros. `status` es el ciclo de vida del tenant y
 * no el `TenantStatus` de sharding, por eso se llama `TenantLifecycle`.
 */
export interface TenantSummary {
  id: string;
  /** Identificador legible en la URL, único en toda la plataforma. */
  slug: string;
  name: string;
  /** Región donde viven los datos del tenant. */
  region: string;
  kind: TenantKind;
  status: TenantLifecycle;
}

/** Alta de un tenant. La región la fija el servidor si el cliente no la indica. */
export interface CreateTenantRequest {
  slug: string;
  name: string;
  region?: string;
}

/** Cambios parciales del tenant actual. */
export interface UpdateTenantRequest {
  name?: string;
}

/** Tenant del usuario, con la fecha en que se unió. */
export interface MyTenantSummary {
  id: string;
  slug: string;
  name: string;
  kind: TenantKind;
  status: TenantLifecycle;
  joinedAt: string;
}

export type MyTenantPage = Page<MyTenantSummary>;

/** Cambio de tenant de una sesión abierta. */
export interface SwitchTenantRequest {
  tenantId: string;
}

/** Resultado de suspender, reactivar o descartar un tenant. */
export interface TenantOperationResult {
  tenantId: string;
  status: TenantLifecycle;
}

/** Entrada de la operación interna que crea un tenant en aprovisionamiento. */
export interface CreateTenantInput {
  tenantId: string;
  slug: string;
  name: string;
  region: string;
  kind: TenantKind;
  ownerUserId: string;
}

/** Entrada de las operaciones internas que solo necesitan el tenant. */
export interface TenantRefInput {
  tenantId: string;
}

/** Entrada de la operación interna que suspende un tenant. */
export interface SuspendTenantInput {
  tenantId: string;
  reason?: string;
}

/** Payload de `identity.tenant.created.v1`. */
export interface TenantCreatedPayload {
  tenantId: string;
  slug: string;
  kind: TenantKind;
  region: string;
  ownerUserId: string;
  createdAt: string;
}

/** Payload de `identity.tenant.suspended.v1`. */
export interface TenantSuspendedPayload {
  tenantId: string;
  suspendedAt: string;
}

/** Payload de `identity.tenant.reactivated.v1`. */
export interface TenantReactivatedPayload {
  tenantId: string;
  reactivatedAt: string;
}
