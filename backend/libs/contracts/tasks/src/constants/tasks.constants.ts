/** Field limits of tasks. Every text in the contract is bounded by one of these values. */
export const TasksLimits = {
  titleMax: 200,
  descriptionMax: 5000,
  /** Minimum length of the search text; shorter responds `TASKS.SEARCH.QUERY_TOO_SHORT`. */
  searchQueryMin: 2,
  searchQueryMax: 200,
  /** Cap on the changed fields an event reports: they are those of `TaskField`. */
  maxChangedFields: 3,
} as const;
