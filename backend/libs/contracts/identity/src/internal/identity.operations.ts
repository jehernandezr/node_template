import { Compensation, defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  GetUserAccessInputSchema,
  RevokedSessionsSchema,
  RevokeUserSessionsInputSchema,
  UserAccessSchema,
} from '../schemas/session.schema.js';

/** Revoca todas las sesiones de un usuario. Lo usan backoffice y las sagas de seguridad. */
export const RevokeUserSessionsOperation = defineOperation({
  id: IdentityOperation.RevokeUserSessions,
  input: RevokeUserSessionsInputSchema,
  output: RevokedSessionsSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Revocar sesiones no se deshace por seguridad: el usuario vuelve a iniciar sesión.',
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Revoca todas las sesiones de un usuario y publica el evento.',
});

/** Lee el acceso efectivo de un usuario en un tenant. */
export const GetUserAccessOperation = defineOperation({
  id: IdentityOperation.GetUserAccess,
  input: GetUserAccessInputSchema,
  output: UserAccessSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.UserNotFound],
  description:
    'Devuelve permisos, roles, funcionalidades y flags de un usuario en un tenant.',
});
