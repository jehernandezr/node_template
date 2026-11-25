import { ConfigSection, envNumber } from '@platform/config';
import { z } from 'zod';
import { TenantMoveStrategy } from './tenant-move-strategy.enum.js';

const targetSchema = z.object({
  region: z.string().trim().min(1),
  shard: z.string().trim().min(1),
});

/** `{"<group>": {"region": "...", "shard": "<service logical shard>"}}` as JSON in a variable. */
const targetsSchema = z
  .string()
  .default('{}')
  .transform((raw, ctx) => {
    try {
      return z.record(z.string().min(1), targetSchema).parse(JSON.parse(raw));
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'expected a JSON object of groups with region and shard',
      });
      return z.NEVER;
    }
  });

export const tenantMoveConfigSchema = z.object({
  /** Target groups: the region and the service logical shard in that group. The shard must be in the directory. */
  TENANT_MOVE_TARGETS: targetsSchema,
  /**
   * Days the source keeps a moved tenant's data before `cleanup` deletes it and lowers its fence.
   * At least one: with zero the fence would come down while a process with the old placement cached still writes there.
   */
  TENANT_MOVE_GRACE_DAYS: envNumber({ min: 1, max: 365 }).default(7),
  /**
   * Deadline of the move saga from when it starts. If it passes before the pivot, the saga compensates and the tenant writes
   * to the source again instead of staying frozen.
   */
  TENANT_MOVE_DEADLINE_MS: envNumber({ min: 60_000 }).default(21_600_000),
  TENANT_MOVE_STRATEGY: z
    .enum(TenantMoveStrategy)
    .default(TenantMoveStrategy.Batch),
  /** Rows per read and write batch. */
  TENANT_MOVE_BATCH_SIZE: envNumber({ min: 1, max: 10_000 }).default(500),
  /** Working time of a call; stays under the 6 s deadline of each move operation. */
  TENANT_MOVE_CALL_BUDGET_MS: envNumber({ min: 100, max: 5_000 }).default(
    4_000,
  ),
  /** Cleanup pause between a call that answers that its round continues and the next one. */
  TENANT_MOVE_CLEANUP_PAUSE_MS: envNumber({ min: 0, max: 60_000 }).default(
    1_000,
  ),
  /** Consecutive cleanup calls to a service in one run; the remaining ones are left for the next run. */
  TENANT_MOVE_CLEANUP_MAX_ATTEMPTS: envNumber({ min: 1, max: 1_000 }).default(
    30,
  ),
  /** Look-back margin of each delta round, for transactions that committed late. */
  TENANT_MOVE_DELTA_MARGIN_MS: envNumber({ min: 0 }).default(60_000),
  /** Rows changed in a round below which the copy is considered caught up. */
  TENANT_MOVE_CAUGHT_UP_ROWS: envNumber({ min: 0 }).default(50),
  /**
   * With logical replication: maximum wait for the exclusive lock `REPLICA IDENTITY` takes when publishing or removing
   * a table. If it runs out, the round is repeated on the next call instead of queuing writes.
   */
  TENANT_MOVE_LOCK_TIMEOUT_MS: envNumber({ min: 50, max: 5_000 }).default(
    2_000,
  ),
  /** With logical replication: pending WAL bytes below which the subscription is considered caught up. */
  TENANT_MOVE_CAUGHT_UP_BYTES: envNumber({ min: 0 }).default(1_048_576),
  /**
   * With logical replication: how the target server reaches the source server, if not through the same address
   * this service uses (for example, another network between regions).
   */
  TENANT_MOVE_REPLICATION_HOST: z.string().trim().min(1).optional(),
  TENANT_MOVE_REPLICATION_PORT: envNumber({ min: 1, max: 65_535 }).optional(),
});

export type TenantMoveSettings = z.output<typeof tenantMoveConfigSchema>;

export const TenantMoveConfig = new ConfigSection<TenantMoveSettings>(
  'tenant-move',
  tenantMoveConfigSchema,
);
