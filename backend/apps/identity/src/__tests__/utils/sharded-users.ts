import { createHash } from 'node:crypto';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { MessageBus } from '@platform/messaging';
import { IdentitySettings } from '../../config/identity-settings.js';
import type { UserRef } from '../../shared/types/user-ref.type.js';
import { IdentityShardScopes } from '../../shared/utils/identity-shard-scopes.js';
import { AccessFacade } from '../../modules/access/index.js';
import { PasswordsFacade } from '../../modules/passwords/index.js';
import { UserRegistrar } from '../../modules/users/application/user-registrar.js';
import { EmailFingerprinter } from '../../modules/users/domain/email-fingerprinter.js';
import { UserDirectory } from '../../modules/users/domain/user-directory.js';
import { UserRepository } from '../../modules/users/domain/user.repository.js';
import type { IdentityTestApp } from './identity-test-app.js';
import { PresetIdGenerator } from './preset-id-generator.js';

/** Un usuario verificado de prueba con su email. */
export interface PlacedUser {
  readonly ref: UserRef;
  readonly email: string;
}

/**
 * Usuarios del tenant compartido repartidos en los dos shards. El router los reparte por el hash de su id,
 * así que se eligen de antemano ids cuyo hash cae en cada shard y se registran con esos ids: el reparto no
 * depende del azar. Los candidatos salen del prefijo, para que dos llamadas de una suite no choquen.
 */
export class ShardedUsers {
  private static readonly MAX_CANDIDATES = 256;
  static readonly PASSWORD = [
    'Una',
    'frase',
    'larga',
    'de',
    'prueba',
    '2026',
  ].join('-');

  constructor(private readonly app: IdentityTestApp) {}

  /** Un usuario verificado por shard, con su email, indexado por el nombre del shard. */
  async oneInEachShard(
    prefix: string,
  ): Promise<ReadonlyMap<string, PlacedUser>> {
    const chosen = await this.idsInEachShard(prefix);
    const placed = new Map<string, PlacedUser>();
    for (const [shard, userId] of chosen) {
      const email = `${prefix}.${shard.replaceAll('_', '-')}@example.com`;
      placed.set(shard, { ref: await this.register(email, userId), email });
    }
    return placed;
  }

  /** Registra un usuario verificado y miembro de su tenant de origen, como el registro por HTTP; con `userId`, ese es su id. */
  async register(email: string, userId?: string): Promise<UserRef> {
    const ref = await this.registrar(userId).register(
      {
        email,
        password: ShardedUsers.PASSWORD,
        displayName: email,
        locale: 'es-MX',
        homeTenantId: this.homeTenantId(),
      },
      new Date(),
    );
    if (ref === undefined) {
      throw new Error(`El email ${email} ya estaba registrado`);
    }
    await this.app.get(AccessFacade).addMember(this.homeTenantId(), ref, []);
    return ref;
  }

  private async idsInEachShard(
    prefix: string,
  ): Promise<ReadonlyMap<string, string>> {
    const probe = this.app.shards();
    const candidates = new SequentialIdGenerator(this.epochOf(prefix));
    const chosen = new Map<string, string>();
    for (
      let attempt = 0;
      attempt < ShardedUsers.MAX_CANDIDATES &&
      chosen.size < probe.names().length;
      attempt += 1
    ) {
      const userId = candidates.next().toString();
      const shard = await probe.shardOfUser({
        userId,
        homeTenantId: this.homeTenantId(),
      });
      if (!chosen.has(shard)) {
        chosen.set(shard, userId);
      }
    }
    if (chosen.size < probe.names().length) {
      throw new Error('Ningún candidato cae en alguno de los shards');
    }
    return chosen;
  }

  /** Un instante propio del prefijo: los ids candidatos de cada prefijo son distintos y siempre los mismos. */
  private epochOf(prefix: string): Date {
    const offset = createHash('sha256')
      .update(prefix)
      .digest()
      .readUIntBE(0, 4);
    return new Date(Date.UTC(2026, 0, 1) + offset * 1_000);
  }

  private registrar(userId: string | undefined): UserRegistrar {
    if (userId === undefined) {
      return this.app.get(UserRegistrar);
    }
    return new UserRegistrar(
      this.app.get(UserRepository),
      this.app.get(UserDirectory),
      this.app.get(EmailFingerprinter),
      this.app.get(PasswordsFacade),
      this.app.get(IdentityShardScopes),
      this.app.get(TransactionManager),
      this.app.get(MessageBus),
      new PresetIdGenerator([userId], this.app.get(IdGenerator)),
      this.app.get(Clock),
      this.app.get(IdentitySettings),
    );
  }

  private homeTenantId(): string {
    return String(this.app.env()['IDENTITY_DEFAULT_TENANT_ID']);
  }
}
