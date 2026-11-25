/** Tasks changed (including deleted ones) since an instant, ordered by change and then by id. */
export interface TaskChangesRequest {
  readonly updatedAfter?: Date;
  readonly after?: { readonly updatedAt: Date; readonly id: string };
  readonly limit: number;
}
