import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { AccessFacade } from '../application/access.facade.js';
import { AccessResolver } from '../application/access-resolver.js';
import { AccessVersionPublisher } from '../application/access-version-publisher.js';
import { ActorPermissions } from '../application/actor-permissions.js';
import { GrantCeiling } from '../application/grant-ceiling.js';
import { GetSessionAccess } from '../application/get-session-access.use-case.js';
import { ListMembersByPermission } from '../application/list-members-by-permission.use-case.js';
import { LocalAccessFacade } from '../application/local-access.facade.js';
import { ManageGroups } from '../application/manage-groups.use-case.js';
import { ManageMembers } from '../application/manage-members.use-case.js';
import { ManageRoles } from '../application/manage-roles.use-case.js';
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
import { AccessController } from './access.controller.js';
import { AccessInternalOperations } from './access.internal-operations.js';

/** Membresías, grupos, roles, permisos efectivos y versión de permisos. Global solo para su fachada. */
@Global()
@Module({
  imports: [
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
  controllers: [AccessController],
  providers: [
    {
      provide: TenantAccessRepository,
      useClass: TypeOrmTenantAccessRepository,
    },
    { provide: UserAccessRepository, useClass: TypeOrmUserAccessRepository },
    AccessResolver,
    AccessVersionPublisher,
    TenantAccessSetup,
    GetSessionAccess,
    ManageMembers,
    ManageGroups,
    ManageRoles,
    ActorPermissions,
    GrantCeiling,
    ListMembersByPermission,
    { provide: AccessFacade, useClass: LocalAccessFacade },
    AccessInternalOperations,
  ],
  exports: [AccessFacade],
})
export class AccessModule {}
