import type { Clock } from '@platform/kernel';
import {
  AuthStateKey,
  AuthStateReader,
  AuthStateSchemas,
  type AccessGrant,
  type ApiKeyPrincipal,
  type Epoch,
  type PermissionVersion,
} from '@platform/auth';
import { ValkeyCommand } from '../valkey-command.enum.js';
import type { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';
import { ValkeyAuthJson } from './valkey-auth-json.js';

/** A member of `auth:revoked-index` with its expiry as epoch ms. */
interface ScanMember {
  readonly sessionId: string;
  readonly score: number;
}

/** A page of `ZSCAN`. */
interface ScanPage {
  readonly cursor: string;
  readonly members: readonly ScanMember[];
}

/**
 * `AuthStateReader` on the Valkey `auth:*` keys. The keys do not carry the
 * service prefix: they are built with `AuthStateKey`, not with `ValkeyKeyspace`. It validates
 * with `AuthStateSchemas` everything it reads; a reply that does not conform is a
 * `ValkeyUnexpectedReplyError`.
 */
export class ValkeyAuthStateReader extends AuthStateReader {
  /** `COUNT` hint of each `ZSCAN` over `auth:revoked-index`. */
  static readonly BATCH_SIZE = 1_000;

  private static readonly VERSION_PATTERN = /^\d{1,15}$/;

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly clock: Clock,
  ) {
    super();
  }

  override async isSessionRevoked(sessionId: string): Promise<boolean> {
    return (await this.text(AuthStateKey.revoked(sessionId))) !== undefined;
  }

  /**
   * Walks the index with `ZSCAN` and not with pages by position: cleaning up the
   * expired entries shifts the positions while reading and a skipped session would be a "no"
   * from the Bloom filter for a revoked session. `ZSCAN` guarantees to return everything that was
   * in the index during the whole walk; what is added midway is covered by the channel.
   */
  override async *revokedSessionIds(
    signal?: AbortSignal,
  ): AsyncIterable<readonly string[]> {
    const nowMs = this.clock.now().getTime();
    let cursor = '0';
    do {
      if (signal?.aborted === true) {
        return;
      }
      const reply = await this.executor.run(ValkeyCommand.Zscan, [
        AuthStateKey.REVOKED_INDEX,
        cursor,
        'COUNT',
        ValkeyAuthStateReader.BATCH_SIZE,
      ]);
      const page = this.scanPage(reply);
      const batch = page.members
        .filter((entry) => entry.score > nowMs)
        .map((entry) => entry.sessionId);
      if (batch.length > 0) {
        yield batch;
      }
      cursor = page.cursor;
    } while (cursor !== '0');
  }

  override async userEpoch(userId: string): Promise<Epoch | undefined> {
    return this.epoch(AuthStateKey.userEpoch(userId));
  }

  override async tenantEpoch(tenantId: string): Promise<Epoch | undefined> {
    return this.epoch(AuthStateKey.tenantEpoch(tenantId));
  }

  override async permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined> {
    const [tenant, user] = await Promise.all([
      this.text(AuthStateKey.tenantPermissionVersion(tenantId)),
      this.text(AuthStateKey.userPermissionVersion(tenantId, userId)),
    ]);
    if (tenant === undefined || user === undefined) {
      return undefined;
    }
    return { tenant: this.counter(tenant), user: this.counter(user) };
  }

  override async accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined> {
    const text = await this.text(AuthStateKey.access(tenantId, userId));
    return text === undefined
      ? undefined
      : ValkeyAuthJson.parse(
          ValkeyCommand.Get,
          text,
          AuthStateSchemas.ACCESS_GRANT,
        );
  }

  override async apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    const reply = await this.executor.run(ValkeyCommand.Hget, [
      AuthStateKey.apiKey(prefix),
      secretHash,
    ]);
    const text = this.executor.optionalString(ValkeyCommand.Hget, reply);
    return text === undefined
      ? undefined
      : ValkeyAuthJson.parse(
          ValkeyCommand.Hget,
          text,
          AuthStateSchemas.API_KEY_PRINCIPAL,
        );
  }

  private async epoch(key: string): Promise<Epoch | undefined> {
    const text = await this.text(key);
    return text === undefined
      ? undefined
      : ValkeyAuthJson.parse(ValkeyCommand.Get, text, AuthStateSchemas.EPOCH);
  }

  private async text(key: string): Promise<string | undefined> {
    return this.executor.optionalString(
      ValkeyCommand.Get,
      await this.executor.run(ValkeyCommand.Get, [key]),
    );
  }

  private counter(text: string): number {
    if (!ValkeyAuthStateReader.VERSION_PATTERN.test(text)) {
      throw new ValkeyUnexpectedReplyError(
        ValkeyCommand.Get,
        'a non-negative integer',
      );
    }
    return Number(text);
  }

  /** Reads a `ZSCAN` page: the next cursor and the member and score pairs. */
  private scanPage(reply: unknown): ScanPage {
    const shape = 'a cursor and a flat list of members and scores';
    if (!Array.isArray(reply) || reply.length !== 2) {
      throw new ValkeyUnexpectedReplyError(ValkeyCommand.Zscan, shape);
    }
    const [cursor, flat] = reply;
    if (
      typeof cursor !== 'string' ||
      !Array.isArray(flat) ||
      flat.length % 2 !== 0
    ) {
      throw new ValkeyUnexpectedReplyError(ValkeyCommand.Zscan, shape);
    }
    const members: ScanMember[] = [];
    for (let index = 0; index < flat.length; index += 2) {
      const sessionId: unknown = flat[index];
      const score: unknown = flat[index + 1];
      if (typeof sessionId !== 'string' || typeof score !== 'string') {
        throw new ValkeyUnexpectedReplyError(ValkeyCommand.Zscan, shape);
      }
      members.push({ sessionId, score: Number(score) });
    }
    return { cursor, members };
  }
}
