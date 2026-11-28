import { PlatformErrorCode as C } from '../enums/platform-error-code.enum.js';
import { ProblemDetailKey } from '../enums/problem-detail-key.enum.js';
import { defineErrorCatalog, ErrorSpecs } from '../kit/error-catalog.js';

const pub = ErrorSpecs.pub;

/**
 * Catalog of the public and cross-cutting codes of the platform. Each one
 * has a message in the front ARB with the `messageKey` key. The internal
 * codes of each library live in that library's catalog, and the service
 * composes all of them.
 */
export const platformErrorCatalog = defineErrorCatalog(C, {
  [C.ValidationInvalidInput]: pub(
    400,
    false,
    'The input does not match the expected format or rules.',
  ),
  [C.ValidationRequired]: pub(400, false, 'A required field is missing.'),
  [C.ValidationInvalidType]: pub(
    400,
    false,
    'A field has a different data type than expected.',
  ),
  [C.ValidationInvalidFormat]: pub(
    400,
    false,
    'A field does not match the expected format, such as email, UUID or pattern.',
  ),
  [C.ValidationInvalidEnum]: pub(
    400,
    false,
    'A field has a value that is not among the allowed ones.',
  ),
  [C.ValidationTooShort]: pub(
    400,
    false,
    'A text or a list has fewer elements than allowed.',
  ),
  [C.ValidationTooLong]: pub(
    400,
    false,
    'A text or a list has more elements than allowed.',
  ),
  [C.ValidationTooSmall]: pub(
    400,
    false,
    'A number is lower than the allowed minimum.',
  ),
  [C.ValidationTooLarge]: pub(
    400,
    false,
    'A number is greater than the allowed maximum.',
  ),
  [C.ValidationUnknownField]: pub(
    400,
    false,
    'The request includes a field the contract does not define.',
  ),
  [C.InternalUnexpected]: pub(
    500,
    false,
    'An unexpected server error occurred.',
  ),
  [C.AuthUnauthenticated]: pub(
    401,
    false,
    'The request does not include valid credentials.',
  ),
  [C.AuthForbidden]: pub(
    403,
    false,
    'You do not have permission to perform this action.',
  ),
  [C.AuthTokenExpired]: pub(
    401,
    true,
    'The access token expired. The client refreshes the session and retries.',
  ),
  [C.AuthOriginRejected]: pub(
    403,
    false,
    'The origin of the request is not allowed.',
  ),
  [C.RateLimitExceeded]: pub(
    429,
    true,
    'The request limit was exceeded. Try again later.',
  ),
  [C.ApiVersionSunset]: pub(
    410,
    false,
    'This API version is no longer available.',
  ),
  [C.ApiUnsupportedVersion]: pub(
    400,
    false,
    'The requested API version is not supported.',
  ),
  [C.HttpPayloadTooLarge]: pub(
    413,
    false,
    'The request body exceeds the allowed size.',
  ),
  [C.HttpUnsupportedMediaType]: pub(
    415,
    false,
    'The content type of the request is not supported.',
  ),
  [C.HttpMalformedBody]: pub(400, false, 'The request body is not valid JSON.'),
  [C.AccessFeatureNotIncluded]: pub(
    403,
    false,
    'The tenant plan does not include the feature the operation requires.',
  ),
  [C.AccessFlagDisabled]: pub(
    404,
    false,
    'The flag that enables the route is off: it behaves like a nonexistent route.',
  ),
  [C.ResourceNotFound]: pub(
    404,
    false,
    'The requested resource does not exist.',
  ),
  [C.ConflictVersionMismatch]: pub(
    409,
    false,
    'The resource changed since the last read. Reload it.',
  ),
  [C.KernelInvalidId]: pub(
    400,
    false,
    'The identifier does not have a valid format.',
  ),
  [C.ShardingKeyMissing]: pub(
    400,
    false,
    'The tenant sharding key is missing from the request.',
  ),
  [C.ShardingCrossShardTx]: pub(
    409,
    false,
    'The transaction involves data from more than one shard.',
  ),
  [C.ShardingTenantMigrating]: pub(
    503,
    true,
    'The tenant is being migrated. Try again in a few moments.',
  ),
  [C.ShardingTenantNotWritable]: pub(
    503,
    true,
    'The tenant is read-only for maintenance. Try again later.',
  ),
  [C.ShardingWrongRegion]: pub(
    421,
    false,
    'The tenant lives in another region. Repeat the request against the URL in `details.apiBaseUrl`.',
    [ProblemDetailKey.ApiBaseUrl, ProblemDetailKey.Region],
  ),
  [C.CriteriaUnknownField]: pub(
    400,
    false,
    'The query filters or sorts by a field that does not exist.',
  ),
  [C.CriteriaInvalidValue]: pub(
    400,
    false,
    'The query has an invalid value or cursor.',
  ),
  [C.CriteriaInvalidLimit]: pub(
    400,
    false,
    'The page size is outside the allowed range.',
  ),
  [C.ResilienceCircuitOpen]: pub(
    503,
    true,
    'A service the operation depends on is not available right now.',
  ),
  [C.ResilienceTimeout]: pub(
    504,
    true,
    'The operation took longer than allowed.',
  ),
  [C.ResilienceBulkheadFull]: pub(
    503,
    true,
    'There are too many operations in progress. Try again in a few moments.',
  ),
  [C.ResilienceOverloaded]: pub(
    503,
    true,
    'The service is overloaded. Try again in a few moments.',
  ),
  [C.DependencyUnavailable]: pub(
    503,
    true,
    'A shared dependency of the service is not available right now. Try again in a few moments.',
  ),
});
