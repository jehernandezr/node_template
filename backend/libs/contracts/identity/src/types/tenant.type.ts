import type { Page } from '@contracts/platform';
import type { TenantKind, TenantLifecycle } from '../enums/tenant.enum.js';

/**
 * Tenant visible to its members. `status` is the tenant lifecycle and
 * not the sharding `TenantStatus`, which is why it is called `TenantLifecycle`.
 */
export interface TenantSummary {
  id: string;
  /** Readable identifier in the URL, unique across the whole platform. */
  slug: string;
  name: string;
  /** Region where the tenant's data lives. */
  region: string;
  kind: TenantKind;
  status: TenantLifecycle;
}

/** Creation of a tenant. The server sets the region if the client does not provide it. */
export interface CreateTenantRequest {
  slug: string;
  name: string;
  region?: string;
}

/** Partial changes to the current tenant. */
export interface UpdateTenantRequest {
  name?: string;
}

/** Tenant of the user, with the date the user joined. */
export interface MyTenantSummary {
  id: string;
  slug: string;
  name: string;
  kind: TenantKind;
  status: TenantLifecycle;
  joinedAt: string;
}

export type MyTenantPage = Page<MyTenantSummary>;

/** Tenant switch of an open session. */
export interface SwitchTenantRequest {
  tenantId: string;
}

/** Result of suspending, reactivating or discarding a tenant. */
export interface TenantOperationResult {
  tenantId: string;
  status: TenantLifecycle;
}

/** Input of the internal operation that creates a tenant in provisioning. */
export interface CreateTenantInput {
  tenantId: string;
  slug: string;
  name: string;
  region: string;
  kind: TenantKind;
  ownerUserId: string;
}

/** Input of the internal operations that only need the tenant. */
export interface TenantRefInput {
  tenantId: string;
}

/** Input of the internal operation that suspends a tenant. */
export interface SuspendTenantInput {
  tenantId: string;
  reason?: string;
}

/** Payload of `identity.tenant.created.v1`. */
export interface TenantCreatedPayload {
  tenantId: string;
  slug: string;
  kind: TenantKind;
  region: string;
  /** Initial owner. Missing in tenants seeded by the platform, which are created without an owner. */
  ownerUserId?: string;
  createdAt: string;
}

/** Payload of `identity.tenant.suspended.v1`. */
export interface TenantSuspendedPayload {
  tenantId: string;
  suspendedAt: string;
}

/** Payload of `identity.tenant.reactivated.v1`. */
export interface TenantReactivatedPayload {
  tenantId: string;
  reactivatedAt: string;
}
