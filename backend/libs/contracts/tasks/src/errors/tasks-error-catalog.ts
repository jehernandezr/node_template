import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { TasksErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;

/** Catálogo de los códigos de tasks. */
export const tasksErrorCatalog = defineErrorCatalog(C, {
  [C.TaskNotFound]: pub(404, false, 'La tarea no existe en el tenant activo.'),
  [C.TaskVersionConflict]: pub(
    409,
    false,
    'La tarea cambió desde que se leyó: la versión esperada ya no es la actual.',
  ),
  [C.SearchQueryTooShort]: pub(
    400,
    false,
    'El texto de búsqueda es más corto que el mínimo permitido.',
  ),
});
