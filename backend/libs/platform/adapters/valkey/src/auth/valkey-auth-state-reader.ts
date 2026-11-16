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

/** Un miembro de `auth:revoked-index` con su vencimiento en epoch en ms. */
interface ScanMember {
  readonly sessionId: string;
  readonly score: number;
}

/** Una página de `ZSCAN`. */
interface ScanPage {
  readonly cursor: string;
  readonly members: readonly ScanMember[];
}

/**
 * `AuthStateReader` sobre las llaves `auth:*` de Valkey. Las llaves no llevan el
 * prefijo del servicio: se arman con `AuthStateKey`, no con `ValkeyKeyspace`. Valida
 * con `AuthStateSchemas` todo lo que lee; una respuesta que no cumple es un
 * `ValkeyUnexpectedReplyError`.
 */
export class ValkeyAuthStateReader extends AuthStateReader {
  /** Pista de `COUNT` de cada `ZSCAN` sobre `auth:revoked-index`. */
  static readonly BATCH_SIZE = 1_000;

  private static readonly VERSION_PATTERN = /^\d{1,15}$/;

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly clock: Clock,
  ) {
    super();
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    return (await this.text(AuthStateKey.revoked(sessionId))) !== undefined;
  }

  /**
   * Recorre el índice con `ZSCAN` y no con páginas por posición: la limpieza de lo
   * vencido corre las posiciones mientras se lee y una sesión saltada sería un "no"
   * del Bloom para una sesión revocada. `ZSCAN` garantiza devolver todo lo que estuvo
   * en el índice durante el recorrido completo; lo agregado a mitad lo cubre el canal.
   */
  async *revokedSessionIds(
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

  async userEpoch(userId: string): Promise<Epoch | undefined> {
    return this.epoch(AuthStateKey.userEpoch(userId));
  }

  async tenantEpoch(tenantId: string): Promise<Epoch | undefined> {
    return this.epoch(AuthStateKey.tenantEpoch(tenantId));
  }

  async permissionVersion(
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

  async accessGrant(
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

  async apiKey(
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

  /** Lee una página de `ZSCAN`: el cursor siguiente y los pares miembro y puntaje. */
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
