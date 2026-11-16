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
import { ValkeyCommand } from '../valkey-command.enum.js';
import type { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyAuthJson } from './valkey-auth-json.js';

/**
 * `AuthStateWriter` sobre las llaves `auth:*` de Valkey. Solo identity la usa: su
 * usuario de Valkey es el único con escritura sobre `auth:*`.
 */
export class ValkeyAuthStateWriter extends AuthStateWriter {
  /** Vida de un `AccessGrant` guardado. */
  static readonly ACCESS_GRANT_TTL_MS = 15 * 60_000;

  /** Vida de un principal de API key guardado. */
  static readonly API_KEY_TTL_MS = 60_000;

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly clock: Clock,
  ) {
    super();
  }

  /**
   * Sin atomicidad entre llaves (están en slots distintos), así que el orden
   * protege al Bloom: primero el índice y después la llave. Una llave sin entrada
   * en el índice sería un "no" definitivo para una sesión revocada; una entrada sin
   * llave solo cuesta una consulta. El aviso va al final, cuando quien lo recibe
   * ya puede confirmar la revocación.
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
    await this.executor.run(ValkeyCommand.Set, [key, String(version)]);
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
