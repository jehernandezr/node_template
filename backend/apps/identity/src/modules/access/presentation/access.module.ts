import { Module } from '@nestjs/common';
import { GetSessionAccess } from '../application/get-session-access.use-case.js';
import { ListMembersByPermission } from '../application/list-members-by-permission.use-case.js';
import { ManageGroups } from '../application/manage-groups.use-case.js';
import { ListMembers } from '../application/list-members.use-case.js';
import { ManageRoles } from '../application/manage-roles.use-case.js';
import { AccessController } from './access.controller.js';
import { AccessInternalOperations } from './access.internal-operations.js';

import { AccessCoreModule } from './access-core.module.js';
import { SessionsModule } from '../../sessions/module.js';
import { UsersCoreModule } from '../../users/module.js';

/** Memberships, groups, roles, effective permissions and permission versions. */
@Module({
  imports: [AccessCoreModule, SessionsModule, UsersCoreModule],
  controllers: [AccessController],
  providers: [
    GetSessionAccess,
    ListMembers,
    ManageGroups,
    ManageRoles,
    ListMembersByPermission,
    AccessInternalOperations,
  ],
})
export class AccessModule {}
