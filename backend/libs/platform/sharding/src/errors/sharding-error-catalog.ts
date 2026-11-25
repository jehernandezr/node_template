import {
  defineErrorCatalog,
  ErrorSpecs,
  ProblemDetailKey,
} from '@contracts/platform';
import { ShardingErrorCode } from './sharding-error-code.enum.js';

/**
 * Catalog of the `@platform/sharding` codes. The public ones repeat those of the
 * central catalog, which only holds the cross-cutting ones.
 */
export const shardingErrorCatalog = defineErrorCatalog(ShardingErrorCode, {
  [ShardingErrorCode.KeyMissing]: ErrorSpecs.pub(
    400,
    false,
    'The tenant shard key is missing from the request.',
  ),
  [ShardingErrorCode.CrossShardTransaction]: ErrorSpecs.pub(
    409,
    false,
    'The transaction involves data from more than one shard.',
  ),
  [ShardingErrorCode.TenantMigrating]: ErrorSpecs.pub(
    503,
    true,
    'The tenant is being migrated. Try again in a few moments.',
  ),
  [ShardingErrorCode.TenantNotWritable]: ErrorSpecs.pub(
    503,
    true,
    'The tenant is read-only for maintenance. Try again later.',
  ),
  [ShardingErrorCode.UnknownTenant]: ErrorSpecs.internal(
    500,
    false,
    'The tenant is not in the shard directory.',
  ),
  [ShardingErrorCode.UnknownShard]: ErrorSpecs.internal(
    500,
    false,
    'The given shard does not exist in the configuration.',
  ),
  [ShardingErrorCode.WrongRegion]: ErrorSpecs.pub(
    421,
    false,
    'The tenant lives in another region. Repeat the request against the URL in `details.apiBaseUrl`.',
    [ProblemDetailKey.ApiBaseUrl, ProblemDetailKey.Region],
  ),
  [ShardingErrorCode.InvalidTenantId]: ErrorSpecs.internal(
    400,
    false,
    'The tenant id does not have the expected format.',
  ),
  [ShardingErrorCode.InvalidKey]: ErrorSpecs.internal(
    400,
    false,
    'The routing key is not valid.',
  ),
  [ShardingErrorCode.InvalidConfiguration]: ErrorSpecs.internal(
    500,
    false,
    'The sharding configuration is not valid.',
  ),
});
