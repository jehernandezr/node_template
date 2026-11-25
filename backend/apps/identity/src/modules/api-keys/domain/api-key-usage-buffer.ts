/** Last use of an API key, pending to be stored in its shard. */
export interface ApiKeyUsage {
  readonly tenantId: string;
  readonly apiKeyId: string;
  readonly lastUsedAt: Date;
}

/**
 * Accumulates the last use of each API key outside the database: a key is used on every request and writing its row
 * each time would load its tenant's shard. A job flushes what was accumulated.
 */
export abstract class ApiKeyUsageBuffer {
  abstract record(usage: ApiKeyUsage): Promise<void>;
  /** Returns what was accumulated and empties it; what arrives afterwards is kept for next time. */
  abstract drain(): Promise<readonly ApiKeyUsage[]>;
}
