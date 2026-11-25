import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** Catalog of the `@platform/resilience` codes. */
export const resilienceErrorCatalog = defineErrorCatalog(ResilienceErrorCode, {
  [ResilienceErrorCode.CircuitOpen]: ErrorSpecs.pub(
    503,
    true,
    'A service the operation depends on is unavailable right now.',
  ),
  [ResilienceErrorCode.Timeout]: ErrorSpecs.pub(
    504,
    true,
    'The operation took longer than allowed.',
  ),
  [ResilienceErrorCode.BulkheadFull]: ErrorSpecs.pub(
    503,
    true,
    'Too many operations in progress. Try again in a moment.',
  ),
  [ResilienceErrorCode.UnknownPolicy]: ErrorSpecs.internal(
    500,
    false,
    'The requested resilience policy does not exist.',
  ),
  [ResilienceErrorCode.InvalidPolicy]: ErrorSpecs.internal(
    500,
    false,
    'The configuration of a resilience policy is not valid.',
  ),
});
