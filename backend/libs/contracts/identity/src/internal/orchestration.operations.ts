import { Compensation, defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  EraseUserInputSchema,
  EraseUserResultSchema,
  ListMembersByPermissionInputSchema,
  ListPushTargetsInputSchema,
  PushTargetsSchema,
  UserRefPageSchema,
} from '../schemas/orchestration.schema.js';
import {
  TenantOperationResultSchema,
  TenantRefInputSchema,
} from '../schemas/tenant.schema.js';

/** Activa un tenant que terminó de aprovisionarse. Va después del pivote de la saga: es idempotente y no se revierte. */
export const ActivateTenantOperation = defineOperation({
  id: IdentityOperation.ActivateTenant,
  input: TenantRefInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Corre después del pivote de la saga: se repite hasta completarse y no se revierte.',
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Activa un tenant en aprovisionamiento.',
});

/** Borra los datos personales de un usuario. Es posterior al pivote de `DeleteAccount`. */
export const EraseUserOperation = defineOperation({
  id: IdentityOperation.EraseUser,
  input: EraseUserInputSchema,
  output: EraseUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'El borrado de datos personales es irreversible y corre después del pivote de la saga.',
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 6_000,
  description: 'Borra los datos personales de un usuario.',
});

/** Lista los dispositivos con push de un usuario. Lo usa notifications para el canal push. */
export const ListPushTargetsOperation = defineOperation({
  id: IdentityOperation.ListPushTargets,
  input: ListPushTargetsInputSchema,
  output: PushTargetsSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Devuelve los dispositivos con token de push de un usuario.',
});

/** Lista los miembros de un tenant que tienen un permiso. Lo usa notifications para elegir destinatarios. */
export const ListMembersByPermissionOperation = defineOperation({
  id: IdentityOperation.ListMembersByPermission,
  input: ListMembersByPermissionInputSchema,
  output: UserRefPageSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Pagina los miembros de un tenant que tienen un permiso.',
});
