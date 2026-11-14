import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { SchedulingErrorCode } from './scheduling-error-code.enum.js';

/** Catálogo de los códigos de `@platform/scheduling`; ninguno llega al cliente. */
export const schedulingErrorCatalog = defineErrorCatalog(SchedulingErrorCode, {
  [SchedulingErrorCode.InvalidSchedule]: ErrorSpecs.internal(
    500,
    false,
    'El calendario de un job no es válido.',
  ),
  [SchedulingErrorCode.InvalidCronExpression]: ErrorSpecs.internal(
    500,
    false,
    'La expresión cron de un job no es válida.',
  ),
  [SchedulingErrorCode.DuplicateJob]: ErrorSpecs.internal(
    500,
    false,
    'Dos jobs se registraron con el mismo nombre.',
  ),
  [SchedulingErrorCode.UnknownJob]: ErrorSpecs.internal(
    404,
    false,
    'El job pedido no está registrado.',
  ),
});
