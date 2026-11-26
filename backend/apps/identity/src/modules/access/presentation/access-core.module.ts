import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { AccessFacade } from '../application/access.facade.js';
import { RefreshTenantAccess } from '../application/refresh-tenant-access.use-case.js';
import { AccessResolver } from '../application/access-resolver.js';
import { AccessVersionPublisher } from '../application/access-version-publisher.js';
import { ActorPermissions } from '../application/actor-permissions.js';
import { GrantCeiling } from '../application/grant-ceiling.js';
import { LocalAccessFacade } from '../application/local-access.facade.js';
import { MemberTombstones } from '../domain/member-tombstones.js';
import { TypeOrmMemberTombstones } from '../infrastructure/persistence/typeorm-member-tombstones.js';
import { ManageMembers } from '../application/manage-members.use-case.js';
import { TenantAccessSetup } from '../application/tenant-access-setup.js';
import {
  TenantAccessRepository,
  UserAccessRepository,
} from '../domain/access-store.js';
import { GroupEntity } from '../infrastructure/persistence/entities/group.entity.js';
import { PlatformRoleAssignmentEntity } from '../infrastructure/persistence/entities/platform-role-assignment.entity.js';
import { RoleEntity } from '../infrastructure/persistence/entities/role.entity.js';
import { TenantAccessVersionEntity } from '../infrastructure/persistence/entities/tenant-access-version.entity.js';
import { TenantMemberEntity } from '../infrastructure/persistence/entities/tenant-member.entity.js';
import { UserTenantEntity } from '../infrastructure/persistence/entities/user-tenant.entity.js';
import { TypeOrmTenantAccessRepository } from '../infrastructure/persistence/typeorm-tenant-access.repository.js';
import { TypeOrmUserAccessRepository } from '../infrastructure/persistence/typeorm-user-access.repository.js';
import { TenantsCoreModule } from '../../tenants/module.js';

/**
 * The part of `Access` other modules depend on: its facade and what the facade needs, with the repositories and services its entry module also uses.
 */
@Module({
  imports: [
    TenantsCoreModule,
    PersistenceModule.forFeature({
      entities: [
        TenantMemberEntity,
        GroupEntity,
        RoleEntity,
        TenantAccessVersionEntity,
        UserTenantEntity,
        PlatformRoleAssignmentEntity,
      ],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  providers: [
    {
      provide: TenantAccessRepository,
      useClass: TypeOrmTenantAccessRepository,
    },
    { provide: UserAccessRepository, useClass: TypeOrmUserAccessRepository },
    { provide: MemberTombstones, useClass: TypeOrmMemberTombstones },
    AccessResolver,
    AccessVersionPublisher,
    TenantAccessSetup,
    ManageMembers,
    ActorPermissions,
    GrantCeiling,
    RefreshTenantAccess,
    { provide: AccessFacade, useClass: LocalAccessFacade },
  ],
  exports: [
    TenantAccessRepository,
    UserAccessRepository,
    MemberTombstones,
    AccessResolver,
    AccessVersionPublisher,
    TenantAccessSetup,
    ManageMembers,
    ActorPermissions,
    GrantCeiling,
    RefreshTenantAccess,
    AccessFacade,
  ],
})
export class AccessCoreModule {}
