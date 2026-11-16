import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ReportsErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;

/** Catálogo de los códigos de reports. */
export const reportsErrorCatalog = defineErrorCatalog(C, {
  [C.RunNotFound]: pub(404, false, 'La ejecución del reporte no existe.'),
  [C.RunNotReady]: pub(
    409,
    false,
    'La ejecución todavía no termina: el resultado no está listo.',
  ),
  [C.RunExpired]: pub(
    410,
    false,
    'El resultado de la ejecución venció y ya no se guarda. Genera el reporte de nuevo.',
  ),
  [C.TypeUnknown]: pub(400, false, 'El tipo de reporte no existe.'),
  [C.ParamsInvalidRange]: pub(
    400,
    false,
    'El rango de fechas es inválido: el fin es anterior al inicio o supera el máximo.',
  ),
  [C.ResultTooLarge]: pub(
    422,
    false,
    'El resultado supera el tamaño máximo. Acota el rango de fechas.',
  ),
});
