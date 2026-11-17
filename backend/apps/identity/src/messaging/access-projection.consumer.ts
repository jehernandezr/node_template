import { Injectable } from '@nestjs/common';
import {
  MembershipChangedEvent,
  type MembershipChangedPayload,
} from '@contracts/identity';
import { Subscribe } from '@platform/messaging/nest';
import { AccessFacade } from '../modules/access/index.js';
import { UsersFacade } from '../modules/users/index.js';

/**
 * Mantiene `user_tenants` desde `MembershipChanged` (cola `identity-access-projection`). Los casos de uso ya
 * proyectan después del commit para que el usuario vea el cambio enseguida; este consumidor repara la
 * proyección si el proceso cayó entre el commit y esa escritura. Proyectar es idempotente y lee la
 * membresía vigente del shard del tenant, así que el orden de los eventos no importa.
 */
@Injectable()
export class AccessProjectionConsumer {
  constructor(
    private readonly users: UsersFacade,
    private readonly access: AccessFacade,
  ) {}

  @Subscribe(MembershipChangedEvent)
  async onMembershipChanged(data: MembershipChangedPayload): Promise<void> {
    const ref = await this.users.refOf(data.userId);
    if (ref === undefined) {
      return;
    }
    await this.access.projectMembership(data.tenantId, ref);
  }
}
