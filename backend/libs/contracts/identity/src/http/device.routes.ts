import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  DenyDeviceApprovalRequestSchema,
  DeviceApprovalsSchema,
  PullDeviceApprovalsRequestSchema,
  PushTokenRequestSchema,
  RemoveDeviceRequestSchema,
  UntrustDeviceRequestSchema,
} from '../schemas/device.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/** `DELETE /v1/me/devices/{deviceId}`: quita un dispositivo de la cuenta. */
export const RemoveDeviceRoute = defineRoute({
  id: IdentityRoute.RemoveDevice,
  method: HttpMethod.Delete,
  path: '/v1/me/devices/{deviceId}',
  request: RemoveDeviceRequestSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Quita un dispositivo de la cuenta y cierra sus sesiones.',
});

/** `POST /v1/me/devices/{deviceId}/untrust`: quita la confianza sin borrar el registro. */
export const UntrustDeviceRoute = defineRoute({
  id: IdentityRoute.UntrustDevice,
  method: HttpMethod.Post,
  path: '/v1/me/devices/{deviceId}/untrust',
  request: UntrustDeviceRequestSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Quita la confianza de un dispositivo sin borrar su registro.',
});

/** `PUT /v1/me/devices/current/push-token`: guarda el token push del dispositivo actual. */
export const UpdatePushTokenRoute = defineRoute({
  id: IdentityRoute.UpdatePushToken,
  method: HttpMethod.Put,
  path: '/v1/me/devices/current/push-token',
  request: PushTokenRequestSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Guarda o reemplaza el token push del dispositivo actual.',
});

/** `POST /v1/auth/device-approvals/pull`: aprobaciones pendientes, firmadas por el dispositivo. */
export const PullDeviceApprovalsRoute = defineRoute({
  id: IdentityRoute.PullDeviceApprovals,
  method: HttpMethod.Post,
  path: '/v1/auth/device-approvals/pull',
  request: PullDeviceApprovalsRequestSchema,
  response: DeviceApprovalsSchema,
  errors: [
    IdentityErrorCode.DeviceSignatureInvalid,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Devuelve las aprobaciones pendientes del dispositivo que firma la petición.',
});

/** `POST /v1/auth/device-approvals/{challengeId}/deny`: rechaza una aprobación desde el dispositivo. */
export const DenyDeviceApprovalRoute = defineRoute({
  id: IdentityRoute.DenyDeviceApproval,
  method: HttpMethod.Post,
  path: '/v1/auth/device-approvals/{challengeId}/deny',
  request: DenyDeviceApprovalRequestSchema,
  errors: [
    IdentityErrorCode.DeviceSignatureInvalid,
    PlatformErrorCode.ResourceNotFound,
    PlatformErrorCode.RateLimitExceeded,
  ],
  access: Access.public(),
  description:
    'Rechaza una aprobación pendiente desde el dispositivo que firma la petición.',
});
