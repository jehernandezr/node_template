import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  RevocationReason,
  UserErasedEvent,
  type EraseUserResult,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { DevicesFacade } from '../../devices/index.js';
import { PasskeysFacade } from '../../passkeys/index.js';
import { PasswordsFacade } from '../../passwords/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserRepository } from '../domain/user.repository.js';
import { UserReader } from './user-reader.js';

/**
 * Último paso de `DeleteAccount`: borra los datos personales del usuario, revoca sus sesiones, borra su
 * contraseña, sus passkeys y sus dispositivos, lo quita de sus tenants (cada tenant publica la baja, y billing
 * deja de contarlo), publica `identity.user.erased.v1` y al final quita su fila de `identity_lookup`, que es
 * lo que lo encuentra. Si ya no está en el directorio, el borrado terminó antes: repetirlo responde lo mismo
 * sin tocar nada.
 */
@Injectable()
export class EraseUser {
  constructor(
    private readonly reader: UserReader,
    private readonly users: UserRepository,
    private readonly directory: UserDirectory,
    private readonly sessions: SessionsFacade,
    private readonly passwords: PasswordsFacade,
    private readonly passkeys: PasskeysFacade,
    private readonly devices: DevicesFacade,
    private readonly access: AccessFacade,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<EraseUserResult> {
    const now = this.clock.now();
    const ref = await this.reader.refOf(userId);
    if (ref !== undefined) {
      await this.erase(ref, now);
      await this.sessions.revokeUserSessions(ref, RevocationReason.AdminAction);
      await this.passwords.forget(ref);
      await this.passkeys.forget(ref);
      await this.devices.forget(ref);
      await this.access.removeFromAllTenants(ref);
      await this.directory.forget(userId);
    }
    return { userId, erasedAt: now.toISOString() };
  }

  private erase(ref: UserRef, now: Date): Promise<void> {
    return this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(async () => {
        const user = await this.users.find(ref.userId);
        if (user === undefined) {
          throw new IdentityError(IdentityErrorCode.UserNotFound);
        }
        if (!user.erase()) {
          return;
        }
        await this.users.update(user);
        await this.bus.publish(
          UserErasedEvent,
          {
            userId: ref.userId,
            homeTenantId: ref.homeTenantId,
            erasedAt: now.toISOString(),
          },
          { tenantId: ref.homeTenantId },
        );
      }),
    );
  }
}
