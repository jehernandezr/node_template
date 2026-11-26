import { ActingUser } from '@platform/auth';
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
import { DeviceApprovalsUseCase } from '../application/device-approvals.use-case.js';
import { ManageMyDevices } from '../application/manage-my-devices.use-case.js';

/** HTTP routes of the user's devices and of the sign-in approvals a device answers. */
@Resource(IdentityResource.Devices)
export class DevicesController {
  constructor(
    private readonly mine: ManageMyDevices,
    private readonly approvals: DeviceApprovalsUseCase,
  ) {}

  /**
   * Lists the user's devices.
   * @param actor Signed-in user.
   * @returns Its devices.
   */
  @Endpoint(ListDevicesRoute)
  listDevices(@CurrentActor() actor: Actor | undefined): Promise<DevicePage> {
    return this.mine.list(ActingUser.refOf(ActingUser.of(actor)));
  }

  /**
   * Removes a device and closes its sessions.
   * @param input Device id.
   * @param actor Signed-in user.
   */
  @Endpoint(RemoveDeviceRoute)
  async removeDevice(
    @Input() input: RemoveDeviceRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.mine.remove(
      ActingUser.refOf(ActingUser.of(actor)),
      input.deviceId,
    );
  }

  /**
   * Stops trusting a device.
   * @param input Device id.
   * @param actor Signed-in user.
   */
  @Endpoint(UntrustDeviceRoute)
  async untrustDevice(
    @Input() input: UntrustDeviceRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.mine.untrust(
      ActingUser.refOf(ActingUser.of(actor)),
      input.deviceId,
    );
  }

  /**
   * Registers the push token of the session's device.
   * The current device is the session's (`did`); a session without a device has no one to notify.
   * @param input Push token.
   * @param actor Signed-in user.
   */
  @Endpoint(UpdatePushTokenRoute)
  async updatePushToken(
    @Input() input: PushTokenRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    const user = ActingUser.of(actor);
    if (user.deviceId === undefined) {
      throw HttpProblemError.notFound();
    }
    await this.mine.setPushToken(
      ActingUser.refOf(user),
      user.deviceId,
      input.pushToken,
    );
  }

  /**
   * Returns the approvals pending for a device, proved by its signature.
   * @param input Signed request of the device.
   * @returns The pending approvals.
   */
  @Endpoint(PullDeviceApprovalsRoute)
  pullDeviceApprovals(
    @Input() input: PullDeviceApprovalsRequest,
  ): Promise<DeviceApprovals> {
    return this.approvals.pull(input);
  }

  /**
   * Denies a pending approval from a device.
   * @param input Signed request with the challenge.
   */
  @Endpoint(DenyDeviceApprovalRoute)
  async denyDeviceApproval(
    @Input() input: DenyDeviceApprovalRequest,
  ): Promise<void> {
    await this.approvals.deny(input);
  }
}
