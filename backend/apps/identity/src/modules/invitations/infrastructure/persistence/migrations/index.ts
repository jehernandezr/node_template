import type { MigrationClass } from '@platform/persistence';
import { CreateInvitations1795001000000 } from './1795001000000-CreateInvitations.js';
import { EnableInvitationsTenantIsolation1795001000001 } from './1795001000001-EnableInvitationsTenantIsolation.js';

export const invitationsShardMigrations: readonly MigrationClass[] = [
  CreateInvitations1795001000000,
  EnableInvitationsTenantIsolation1795001000001,
];
