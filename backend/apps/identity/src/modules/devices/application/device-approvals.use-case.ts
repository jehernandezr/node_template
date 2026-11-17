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
 * Aprobaciones del dispositivo verificador. La app las pide con una petición firmada, que prueba que tiene
 * la clave; "No fui yo" cancela el desafío, levanta una alerta y cuenta como un fallo de inicio de sesión
 * desde el origen del intento.
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

  async deny(request: DenyDeviceApprovalRequest): Promise<void> {
    const { route } = await this.signed.verify(
      IdentityRoute.DenyDeviceApproval,
      request,
      [request.challengeId],
    );
    // Solo un desafío que este dispositivo tenía pendiente: un dispositivo no cancela los de otro.
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
