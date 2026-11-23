import { Injectable } from '@nestjs/common';
import type { InvitationStatus } from '@contracts/identity';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { Invitation } from '../../domain/invitation.js';
import { InvitationRepository } from '../../domain/invitation.repository.js';
import { InvitationEntity } from './entities/invitation.entity.js';

/** `InvitationRepository` sobre `invitations` del shard del tenant. */
@Injectable()
export class TypeOrmInvitationRepository
  extends TenantIsolatedRepository
  implements InvitationRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async insert(invitation: Invitation): Promise<void> {
    await this.insertOwned(InvitationEntity, this.toRow(invitation));
  }

  async find(invitationId: string): Promise<Invitation | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(InvitationEntity, { id: invitationId, tenantId }),
    );
    return row === null ? undefined : this.toDomain(row);
  }

  async findByTokenHash(tokenHash: string): Promise<Invitation | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(InvitationEntity, { tokenHash, tenantId }),
    );
    return row === null ? undefined : this.toDomain(row);
  }

  async list(): Promise<readonly Invitation[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager.find(InvitationEntity, {
        where: { tenantId },
        order: { expiresAt: 'DESC' },
      }),
    );
    return rows.map((row) => this.toDomain(row));
  }

  async update(invitation: Invitation): Promise<void> {
    await this.updateOwned(InvitationEntity, this.toRow(invitation));
  }

  private toDomain(row: InvitationEntity): Invitation {
    return Invitation.rehydrate({
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      groupIds: row.groupIds,
      invitedBy: row.invitedBy,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
      status: row.status as InvitationStatus,
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  private toRow(invitation: Invitation): InvitationEntity {
    const state = invitation.snapshot();
    const row = new InvitationEntity();
    row.id = state.id;
    row.email = state.email;
    row.groupIds = [...state.groupIds];
    row.invitedBy = state.invitedBy;
    row.tokenHash = state.tokenHash;
    row.expiresAt = state.expiresAt;
    row.status = state.status;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
