import { Injectable } from '@nestjs/common';
import {
  IdentityRoute,
  SecurityAlertType,
  type DenyDeviceApprovalRequest,
  type DeviceApprovals,
  type PullDeviceApprovalsRequest,
} from '@contracts/identity';
import { Clock } from '@platform/kernel';
import { SecurityAlerts } from '../../alerts/index.js';
import { LockoutKeys, LoginLockout } from '../../authentication/index.js';
import { MfaFacade } from '../../mfa/index.js';
import { UsersFacade } from '../../users/index.js';
import { DeviceApprovalStore } from '../domain/device-approval-store.js';
import { SignedDeviceRequest } from './signed-device-request.js';

/**
 * Approvals of the verifier device. The app requests them with a signed request, which proves it has
 * the key; "No fui yo" cancels the challenge, raises an alert and counts as a sign-in failure
 * from the attempt's origin.
 */
@Injectable()
export class DeviceApprovalsUseCase {
  constructor(
    private readonly signed: SignedDeviceRequest,
    private readonly approvals: DeviceApprovalStore,
    private readonly mfa: MfaFacade,
    private readonly alerts: SecurityAlerts,
    private readonly users: UsersFacade,
    private readonly lockout: LoginLockout,
    private readonly lockoutKeys: LockoutKeys,
    private readonly clock: Clock,
  ) {}

  async pull(request: PullDeviceApprovalsRequest): Promise<DeviceApprovals> {
    const { route } = await this.signed.verify(
      IdentityRoute.PullDeviceApprovals,
      request,
    );
    return {
      approvals: [
        ...(await this.approvals.pending(route.deviceId, this.clock.now())),
      ],
    };
  }

  /**
   * Only a challenge this device had pending: one device does not cancel another's.
   */
  async deny(request: DenyDeviceApprovalRequest): Promise<void> {
    const { route } = await this.signed.verify(
      IdentityRoute.DenyDeviceApproval,
      request,
      [request.challengeId],
    );
    const denied = await this.approvals.remove(
      route.deviceId,
      request.challengeId,
    );
    if (denied === undefined) {
      return;
    }
    await this.mfa.denyChallenge(request.challengeId);
    const account = this.lockoutKeys.account(
      (await this.users.getByRef(route.user)).email,
    );
    const ip = denied.context.ip ?? account;
    await this.lockout.recordFailure(account, ip);
    await this.alerts.raise({
      type: SecurityAlertType.DeviceApprovalDenied,
      user: route.user,
    });
  }
}
