/** Tareas cambiadas (incluidas las borradas) desde un instante, en orden de cambio y luego de id. */
export interface TaskChangesRequest {
  readonly updatedAfter?: Date;
  readonly after?: { readonly updatedAt: Date; readonly id: string };
  readonly limit: number;
}
