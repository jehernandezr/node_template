/** Events of the sharding directory. The value is the CloudEvents type. */
export enum ShardingEvent {
  /** `PlatformEvent.ShardDirectoryChanged` of the plan: a placement or a shard → instance mapping changed. */
  ShardDirectoryChanged = 'platform.sharding.directory-changed.v1',
}

/** What changed in the directory. */
export enum ShardDirectoryChangeKind {
  /** A tenant's placement (region, shard group or status). */
  TenantPlacement = 'tenant-placement',
  /** The physical instance of a logical shard (a `MoveShard` saga). */
  ShardInstance = 'shard-instance',
}

/** A tenant's placement changed. */
export interface TenantPlacementChanged {
  readonly type: ShardingEvent.ShardDirectoryChanged;
  readonly kind: ShardDirectoryChangeKind.TenantPlacement;
  readonly tenantId: string;
  /**
   * Placement version just committed. Receivers drop older placements from every cache level. Without it
   * they only drop their in-process copy.
   */
  readonly version?: number;
}

/** A logical shard moved to another instance. */
export interface ShardInstanceChanged {
  readonly type: ShardingEvent.ShardDirectoryChanged;
  readonly kind: ShardDirectoryChangeKind.ShardInstance;
  readonly logicalShard: string;
}

/** Payload of {@link ShardingEvent.ShardDirectoryChanged}. */
export type ShardDirectoryChanged =
  TenantPlacementChanged | ShardInstanceChanged;

/**
 * Publishes directory changes to every process of the service. Delivery is at most once: a lost message is
 * covered by the tombstone in the shared cache and by the in-process TTL.
 */
export interface ShardDirectoryChangePublisher {
  publish(event: ShardDirectoryChanged): Promise<void>;
}

/** Receives one change. Errors are reported by the subscriber, never thrown back to the channel. */
export type ShardDirectoryChangeHandler = (
  event: ShardDirectoryChanged,
) => void | Promise<void>;

/** Delivers directory changes published by any process. */
export interface ShardDirectoryChangeSubscriber {
  /** @returns a function that stops the subscription. */
  subscribe(handler: ShardDirectoryChangeHandler): Promise<() => Promise<void>>;
}

/** Longest id accepted in a change message. Ids are UUIDv7 or shard names. */
const MAX_ID_LENGTH = 256;

function isId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_ID_LENGTH
  );
}

/** Serializes a change for a text channel (Valkey pub/sub, a queue). */
export function encodeShardDirectoryChanged(
  event: ShardDirectoryChanged,
): string {
  return JSON.stringify(event);
}

/**
 * Parses and validates a change received from a channel. Anything malformed returns undefined, so a bad
 * message is ignored instead of invalidating the wrong tenant.
 */
export function decodeShardDirectoryChanged(
  raw: string,
): ShardDirectoryChanged | undefined {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return undefined;
  }
  const record = data as Record<string, unknown>;
  if (record['type'] !== ShardingEvent.ShardDirectoryChanged) {
    return undefined;
  }
  if (record['kind'] === ShardDirectoryChangeKind.ShardInstance) {
    const logicalShard = record['logicalShard'];
    return isId(logicalShard)
      ? {
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.ShardInstance,
          logicalShard,
        }
      : undefined;
  }
  if (record['kind'] !== ShardDirectoryChangeKind.TenantPlacement) {
    return undefined;
  }
  const { tenantId, version } = record;
  if (!isId(tenantId)) {
    return undefined;
  }
  if (version === undefined) {
    return {
      type: ShardingEvent.ShardDirectoryChanged,
      kind: ShardDirectoryChangeKind.TenantPlacement,
      tenantId,
    };
  }
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 0
  ) {
    return undefined;
  }
  return {
    type: ShardingEvent.ShardDirectoryChanged,
    kind: ShardDirectoryChangeKind.TenantPlacement,
    tenantId,
    version,
  };
}

/**
 * Process-local channel: what is published reaches every subscriber of the same instance. For tests and
 * single-process setups; across processes use the Valkey channel of `@platform/adapters-valkey` or the bus.
 */
export class InMemoryShardDirectoryChannel
  implements ShardDirectoryChangePublisher, ShardDirectoryChangeSubscriber
{
  private readonly handlers = new Set<ShardDirectoryChangeHandler>();

  async publish(event: ShardDirectoryChanged): Promise<void> {
    for (const handler of [...this.handlers]) {
      await handler(event);
    }
  }

  async subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>> {
    // Wrap so the same handler can be subscribed twice and removed once.
    const entry: ShardDirectoryChangeHandler = (event) => handler(event);
    this.handlers.add(entry);
    return async () => {
      this.handlers.delete(entry);
    };
  }
}
