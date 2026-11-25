import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ObservabilityErrorCode } from './observability-error-code.enum.js';

/** Catalog of the `@platform/observability` codes; none reaches the client. */
export const observabilityErrorCatalog = defineErrorCatalog(
  ObservabilityErrorCode,
  {
    [ObservabilityErrorCode.InvalidTraceContext]: ErrorSpecs.internal(
      500,
      false,
      'A trace identifier does not match the W3C format.',
    ),
    [ObservabilityErrorCode.DuplicateHealthCheck]: ErrorSpecs.internal(
      500,
      false,
      'A dependency with the same name was registered twice in health.',
    ),
  },
);
