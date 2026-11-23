/** Valores por defecto de tasks. */
export const TasksDefaults = {
  deletedRetentionDays: 30,
  pageSize: 20,
  /**
   * Autor que queda en las tareas de un usuario borrado. Es un UUIDv7 válido que nunca emite el `IdGenerator`
   * (su marca de tiempo es cero), así el contrato sigue cumpliéndose sin conservar a la persona.
   */
  erasedAuthor: {
    userId: '00000000-0000-7000-8000-000000000000',
    homeTenantId: '00000000-0000-7000-8000-000000000000',
  },
} as const;
