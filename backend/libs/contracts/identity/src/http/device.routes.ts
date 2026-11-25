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

/** `DELETE /v1/me/devices/{deviceId}`: removes a device from the account. */
export const RemoveDeviceRoute = defineRoute({
  id: IdentityRoute.RemoveDevice,
  method: HttpMethod.Delete,
  path: '/v1/me/devices/{deviceId}',
  request: RemoveDeviceRequestSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Removes a device from the account and closes its sessions.',
});

/** `POST /v1/me/devices/{deviceId}/untrust`: removes trust without deleting the record. */
export const UntrustDeviceRoute = defineRoute({
  id: IdentityRoute.UntrustDevice,
  method: HttpMethod.Post,
  path: '/v1/me/devices/{deviceId}/untrust',
  request: UntrustDeviceRequestSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Removes the trust of a device without deleting its record.',
});

/** `PUT /v1/me/devices/current/push-token`: stores the push token of the current device. */
export const UpdatePushTokenRoute = defineRoute({
  id: IdentityRoute.UpdatePushToken,
  method: HttpMethod.Put,
  path: '/v1/me/devices/current/push-token',
  request: PushTokenRequestSchema,
  errors: SessionGuardErrors,
  access: Access.authenticated(),
  description: 'Saves or replaces the push token of the current device.',
});

/** `POST /v1/auth/device-approvals/pull`: pending approvals, signed by the device. */
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
    'Returns the pending approvals of the device that signs the request.',
});

/** `POST /v1/auth/device-approvals/{challengeId}/deny`: rejects an approval from the device. */
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
    'Rejects a pending approval from the device that signs the request.',
});
