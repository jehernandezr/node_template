import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { HttpProblemError } from '@platform/http';
import type { Actor } from '@platform/auth';
import {
  ListDevicesRoute,
  RemoveDeviceRoute,
  UntrustDeviceRoute,
  UpdatePushTokenRoute,
  PullDeviceApprovalsRoute,
  DenyDeviceApprovalRoute,
  type DenyDeviceApprovalRequest,
  type DeviceApprovals,
  type DevicePage,
  type PullDeviceApprovalsRequest,
  type PushTokenRequest,
  type RemoveDeviceRequest,
  type UntrustDeviceRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import {
  requireUserActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { DeviceApprovalsUseCase } from '../application/device-approvals.use-case.js';
import { ManageMyDevices } from '../application/manage-my-devices.use-case.js';

@Resource(IdentityResource.Devices)
export class DevicesController {
  constructor(
    private readonly mine: ManageMyDevices,
    private readonly approvals: DeviceApprovalsUseCase,
  ) {}

  @Endpoint(ListDevicesRoute)
  listDevices(@CurrentActor() actor: Actor | undefined): Promise<DevicePage> {
    return this.mine.list(userRefOf(requireUserActor(actor)));
  }

  @Endpoint(RemoveDeviceRoute)
  async removeDevice(
    @Input() input: RemoveDeviceRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.mine.remove(userRefOf(requireUserActor(actor)), input.deviceId);
  }

  @Endpoint(UntrustDeviceRoute)
  async untrustDevice(
    @Input() input: UntrustDeviceRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.mine.untrust(userRefOf(requireUserActor(actor)), input.deviceId);
  }

  /** El dispositivo actual es el de la sesión (`did`); una sesión sin dispositivo no tiene a quién avisar. */
  @Endpoint(UpdatePushTokenRoute)
  async updatePushToken(
    @Input() input: PushTokenRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    const user = requireUserActor(actor);
    if (user.deviceId === undefined) {
      throw HttpProblemError.notFound();
    }
    await this.mine.setPushToken(
      userRefOf(user),
      user.deviceId,
      input.pushToken,
    );
  }

  @Endpoint(PullDeviceApprovalsRoute)
  pullDeviceApprovals(
    @Input() input: PullDeviceApprovalsRequest,
  ): Promise<DeviceApprovals> {
    return this.approvals.pull(input);
  }

  @Endpoint(DenyDeviceApprovalRoute)
  async denyDeviceApproval(
    @Input() input: DenyDeviceApprovalRequest,
  ): Promise<void> {
    await this.approvals.deny(input);
  }
}
