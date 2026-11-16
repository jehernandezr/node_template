/** Límites de los campos de tasks. Todo texto del contrato se acota con uno de estos valores. */
export const TasksLimits = {
  titleMax: 200,
  descriptionMax: 5000,
  /** Largo mínimo del texto de búsqueda; menos responde `TASKS.SEARCH.QUERY_TOO_SHORT`. */
  searchQueryMin: 2,
  searchQueryMax: 200,
  /** Tope de campos cambiados que informa un evento: son los de `TaskField`. */
  maxChangedFields: 3,
} as const;
