import { Endpoint, Resource } from '@platform/http/nest';
import {
  ListDevicesRoute,
  RemoveDeviceRoute,
  UntrustDeviceRoute,
  UpdatePushTokenRoute,
  PullDeviceApprovalsRoute,
  DenyDeviceApprovalRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Devices)
export class DevicesController {
  @Endpoint(ListDevicesRoute)
  listDevices(): never {
    throw new RouteNotImplementedError(ListDevicesRoute.id);
  }

  @Endpoint(RemoveDeviceRoute)
  removeDevice(): never {
    throw new RouteNotImplementedError(RemoveDeviceRoute.id);
  }

  @Endpoint(UntrustDeviceRoute)
  untrustDevice(): never {
    throw new RouteNotImplementedError(UntrustDeviceRoute.id);
  }

  @Endpoint(UpdatePushTokenRoute)
  updatePushToken(): never {
    throw new RouteNotImplementedError(UpdatePushTokenRoute.id);
  }

  @Endpoint(PullDeviceApprovalsRoute)
  pullDeviceApprovals(): never {
    throw new RouteNotImplementedError(PullDeviceApprovalsRoute.id);
  }

  @Endpoint(DenyDeviceApprovalRoute)
  denyDeviceApproval(): never {
    throw new RouteNotImplementedError(DenyDeviceApprovalRoute.id);
  }
}
