import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ObservabilityErrorCode } from './observability-error-code.enum.js';

/** Catalog of the `@platform/observability` codes; none reaches the client. */
export const observabilityErrorCatalog = defineErrorCatalog(
  ObservabilityErrorCode,
  {
    [ObservabilityErrorCode.InvalidTraceContext]: ErrorSpecs.internal(
      500,
      false,
      'Un identificador de traza no cumple el formato W3C.',
    ),
    [ObservabilityErrorCode.DuplicateHealthCheck]: ErrorSpecs.internal(
      500,
      false,
      'Se registró dos veces una dependencia con el mismo nombre en la salud.',
    ),
  },
);
