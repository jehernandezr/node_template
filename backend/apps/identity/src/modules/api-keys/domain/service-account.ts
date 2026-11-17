import type { Permission, ServiceAccountStatus } from '@contracts/identity';

/** Una cuenta de servicio del tenant: sus API keys actúan con sus permisos. */
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
