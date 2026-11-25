/** Error codes of `@platform/tenant-move`. */
export enum TenantMoveErrorCode {
  /** The target or sign-up group is not configured, or its shard is not in the directory. */
  UnknownTarget = 'PLATFORM.TENANT_MOVE.UNKNOWN_TARGET',
  /** The tenant spreads its data across more than one shard, or already lives on the target. */
  NotMovable = 'PLATFORM.TENANT_MOVE.NOT_MOVABLE',
  /** The round did not finish within the call deadline; the saga repeats it. */
  RoundPending = 'PLATFORM.TENANT_MOVE.ROUND_PENDING',
  /** With the tenant frozen, the target did not end up equal to the source. */
  VerificationFailed = 'PLATFORM.TENANT_MOVE.VERIFICATION_FAILED',
  /** With the fence raised, the tenant still has open work on the source (a half-finished saga). */
  TenantBusy = 'PLATFORM.TENANT_MOVE.TENANT_BUSY',
  /** The service directory still routes the tenant to the shard the cleanup was going to delete. */
  NotSwitched = 'PLATFORM.TENANT_MOVE.NOT_SWITCHED',
  /** Another move of the tenant is between `finalize` and `switch`: cleaning up now could delete its copy. */
  MoveInProgress = 'PLATFORM.TENANT_MOVE.MOVE_IN_PROGRESS',
  /** The tenant already has data in the service: removing it from the directory would orphan the data. */
  TenantHasData = 'PLATFORM.TENANT_MOVE.TENANT_HAS_DATA',
  /** The tenant group collides in the service directory with a dedicated tenant, or it is dedicated and the shard is occupied. */
  ShardTaken = 'PLATFORM.TENANT_MOVE.SHARD_TAKEN',
  /** The manifest names an invalid table or column, or a parent that does not precede it. */
  InvalidManifest = 'PLATFORM.TENANT_MOVE.INVALID_MANIFEST',
}
