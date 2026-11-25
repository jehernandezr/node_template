import type { Deadline } from '@platform/primitives';
import type { ShardAccess } from '../model/shard-access.enum.js';
import type { ShardKey } from '../model/shard-key.enum.js';

/** Input of `ShardRouter.resolve`. */
export interface ResolveRequest {
  /** UUIDv7 by default (see `tenantIdPattern`). */
  readonly tenantId: string;
  readonly keyKind: ShardKey;
  /** Required except with `ShardKey.Tenant`. At most `maxKeyLength` characters. */
  readonly keyValue?: string;
  readonly access: ShardAccess;
  /** Time budget of the lookup. When it expires, `resolve` rejects with `DeadlineExceededError`. */
  readonly deadline?: Deadline;
  /** Cancels the lookup. `resolve` rejects with the signal `reason`. */
  readonly signal?: AbortSignal;
}
