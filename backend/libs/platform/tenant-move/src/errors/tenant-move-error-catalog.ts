import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { TenantMoveErrorCode } from './tenant-move-error-code.enum.js';

/** Catalog of `@platform/tenant-move`. No code reaches the client: an internal operation returns them. */
export const tenantMoveErrorCatalog = defineErrorCatalog(TenantMoveErrorCode, {
  [TenantMoveErrorCode.UnknownTarget]: ErrorSpecs.internal(
    400,
    false,
    'The target group is not configured or its shard is not in the directory.',
  ),
  [TenantMoveErrorCode.NotMovable]: ErrorSpecs.internal(
    409,
    false,
    'The tenant spreads its data across several shards or already lives in the target.',
  ),
  [TenantMoveErrorCode.RoundPending]: ErrorSpecs.internal(
    503,
    true,
    'The copy round is still in progress; the saga repeats the call.',
  ),
  [TenantMoveErrorCode.VerificationFailed]: ErrorSpecs.internal(
    409,
    false,
    'The target did not end up equal to the source with the tenant frozen.',
  ),
  [TenantMoveErrorCode.TenantBusy]: ErrorSpecs.internal(
    409,
    false,
    'The tenant has unfinished sagas in the source; the move is cancelled and launched again when they finish.',
  ),
  [TenantMoveErrorCode.NotSwitched]: ErrorSpecs.internal(
    409,
    false,
    'The service still routes the tenant to the source shard: cleanup does not delete live data.',
  ),
  [TenantMoveErrorCode.MoveInProgress]: ErrorSpecs.internal(
    409,
    false,
    'Another move of the tenant has not pivoted yet: cleanup waits for it to finish so it does not delete its copy.',
  ),
  [TenantMoveErrorCode.TenantHasData]: ErrorSpecs.internal(
    409,
    false,
    'The tenant already has data in the service: it is not removed from the directory.',
  ),
  [TenantMoveErrorCode.ShardTaken]: ErrorSpecs.internal(
    409,
    false,
    'The tenant shard group collides in the service directory with a dedicated tenant.',
  ),
  [TenantMoveErrorCode.InvalidManifest]: ErrorSpecs.internal(
    500,
    false,
    'The service move manifest is not valid.',
  ),
});
