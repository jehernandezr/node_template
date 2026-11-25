import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { PrimitivesErrorCode } from './primitives-error-code.enum.js';

/** Catalog of the `@platform/primitives` codes; none of them reaches the client. */
export const primitivesErrorCatalog = defineErrorCatalog(PrimitivesErrorCode, {
  [PrimitivesErrorCode.InvalidArgument]: ErrorSpecs.internal(
    500,
    false,
    'Invalid argument in a platform primitive.',
  ),
  [PrimitivesErrorCode.NonJsonValue]: ErrorSpecs.internal(
    500,
    false,
    'A value cannot be serialized as canonical JSON.',
  ),
  [PrimitivesErrorCode.DeadlineExceeded]: ErrorSpecs.internal(
    504,
    false,
    'The operation deadline expired.',
  ),
  [PrimitivesErrorCode.StaleClaim]: ErrorSpecs.internal(
    409,
    false,
    'The idempotency claim already belongs to another owner.',
  ),
});
