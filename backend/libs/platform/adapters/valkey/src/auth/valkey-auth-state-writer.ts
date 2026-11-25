import type { Clock } from '@platform/kernel';
import { InvalidArgumentError } from '@platform/primitives';
import {
  AuthStateKey,
  AuthStateWriter,
  type AccessGrant,
  type ApiKeyPrincipal,
  type Epoch,
  type RevocationReason,
} from '@platform/auth';
import { LuaScript } from '../lua-script.js';
import { ValkeyCommand } from '../valkey-command.enum.js';
import type { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyAuthJson } from './valkey-auth-json.js';

/**
 * `AuthStateWriter` over the `auth:*` keys of Valkey. Only identity uses it: its
 * Valkey user is the only one with write access to `auth:*`.
 */
export class ValkeyAuthStateWriter extends AuthStateWriter {
  /** Raises a counter only when the new value is higher, atomically. */
  private static readonly RAISE = new LuaScript(`
local current = tonumber(redis.call('GET', KEYS[1]))
if current ~= nil and current >= tonumber(ARGV[1]) then
  return 0
end
redis.call('SET', KEYS[1], ARGV[1])
return 1
`);

  /** Life of a stored `AccessGrant`. */
  static readonly ACCESS_GRANT_TTL_MS = 15 * 60_000;

  /** Life of a stored API key principal. */
  static readonly API_KEY_TTL_MS = 60_000;

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly clock: Clock,
  ) {
    super();
  }

  /**
   * There is no atomicity across keys (they live in different slots), so the order
   * protects the Bloom filter: first the index and then the key. A key without an
   * entry in the index would be a definitive "no" for a revoked session; an entry
   * without a key only costs a lookup. The announcement goes last, when whoever
   * receives it can already confirm the revocation.
   * {@inheritDoc AuthStateWriter.revokeSession}
   */
  async revokeSession(
    sessionId: string,
    ttlMs: number,
    reason: RevocationReason,
  ): Promise<void> {
    if (ttlMs <= 0) {
      return;
    }
    const px = Math.ceil(ttlMs);
    const nowMs = this.clock.now().getTime();
    await this.executor.run(ValkeyCommand.ZremRangeByScore, [
      AuthStateKey.REVOKED_INDEX,
      '-inf',
      nowMs,
    ]);
    await this.executor.run(ValkeyCommand.Zadd, [
      AuthStateKey.REVOKED_INDEX,
      nowMs + px,
      sessionId,
    ]);
    await this.executor.run(ValkeyCommand.Set, [
      AuthStateKey.revoked(sessionId),
      reason,
      'PX',
      px,
    ]);
    await this.executor.run(ValkeyCommand.Publish, [
      AuthStateKey.REVOCATIONS_CHANNEL,
      sessionId,
    ]);
  }

  async setUserEpoch(userId: string, epoch: Epoch): Promise<void> {
    await this.executor.run(ValkeyCommand.Set, [
      AuthStateKey.userEpoch(userId),
      ValkeyAuthJson.encode(epoch),
    ]);
  }

  async setTenantEpoch(tenantId: string, epoch: Epoch): Promise<void> {
    await this.executor.run(ValkeyCommand.Set, [
      AuthStateKey.tenantEpoch(tenantId),
      ValkeyAuthJson.encode(epoch),
    ]);
  }

  async setPermissionVersion(
    tenantId: string,
    userId: string | undefined,
    version: number,
  ): Promise<void> {
    if (!Number.isSafeInteger(version) || version < 0) {
      throw new InvalidArgumentError('version', 'a non-negative safe integer');
    }
    const key =
      userId === undefined
        ? AuthStateKey.tenantPermissionVersion(tenantId)
        : AuthStateKey.userPermissionVersion(tenantId, userId);
    await this.executor.script(
      ValkeyAuthStateWriter.RAISE,
      [key],
      [String(version)],
    );
  }

  async putAccessGrant(
    tenantId: string,
    userId: string,
    grant: AccessGrant,
  ): Promise<void> {
    await this.executor.run(ValkeyCommand.Set, [
      AuthStateKey.access(tenantId, userId),
      ValkeyAuthJson.encode(grant),
      'PX',
      ValkeyAuthStateWriter.ACCESS_GRANT_TTL_MS,
    ]);
  }

  async putApiKey(
    prefix: string,
    secretHash: string,
    principal: ApiKeyPrincipal,
  ): Promise<void> {
    const key = AuthStateKey.apiKey(prefix);
    await this.executor.run(ValkeyCommand.Hset, [
      key,
      secretHash,
      ValkeyAuthJson.encode(principal),
    ]);
    await this.executor.run(ValkeyCommand.Pexpire, [
      key,
      ValkeyAuthStateWriter.API_KEY_TTL_MS,
    ]);
  }

  async dropApiKey(prefix: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [AuthStateKey.apiKey(prefix)]);
  }
}
