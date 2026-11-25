import type { Permission, ServiceAccountStatus } from '@contracts/identity';

/** A tenant service account: its API keys act with its permissions. */
export interface ServiceAccount {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly permissions: readonly Permission[];
  readonly status: ServiceAccountStatus;
  readonly pinnedApiVersion?: string;
  readonly createdAt: Date;
  readonly version?: number;
}
