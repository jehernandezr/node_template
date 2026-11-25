/** tasks default values. */
export const TasksDefaults = {
  deletedRetentionDays: 30,
  pageSize: 20,
  /**
   * Author left on a deleted user's tasks. It is a valid UUIDv7 that the `IdGenerator` never emits
   * (its timestamp is zero), so the contract still holds without keeping the person.
   */
  erasedAuthor: {
    userId: '00000000-0000-7000-8000-000000000000',
    homeTenantId: '00000000-0000-7000-8000-000000000000',
  },
} as const;
