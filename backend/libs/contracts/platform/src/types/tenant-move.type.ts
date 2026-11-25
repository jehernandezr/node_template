/** Move of a tenant: what each service needs to copy, verify or cancel. */
export interface TenantMoveRef {
  moveId: string;
  tenantId: string;
  /** Target shard group. */
  targetGroup: string;
  /** Destination region. */
  targetRegion: string;
}

/** Copy progress of a table. */
export interface TenantMoveTableProgress {
  table: string;
  copiedRows: number;
  pendingRows: number;
}

/** Result of a copy round. `caughtUp` is true when the lag dropped below the threshold. */
export interface TenantMoveProgress {
  tables: TenantMoveTableProgress[];
  caughtUp: boolean;
}

/** Comparison of a table between source and destination. */
export interface TenantMoveTableCheck {
  table: string;
  sourceRows: number;
  targetRows: number;
  sourceChecksum: string;
  targetChecksum: string;
}

/** Result of the final round and the verification. */
export interface TenantMoveVerification {
  verified: boolean;
  tables: TenantMoveTableCheck[];
}

/** Acknowledgment of a cancellation or a cleanup. */
export interface TenantMoveAck {
  moveId: string;
}
