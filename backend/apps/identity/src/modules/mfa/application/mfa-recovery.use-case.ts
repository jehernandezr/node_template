import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  IdentityErrorCode,
  SecurityAlertType,
  type MfaRecoveryConfirmRequest,
  type MfaRecoveryStarted,
  type SignInResponse,
} from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import { IdentityMailer, SecurityAlerts } from '../../alerts/index.js';
import { DevicesFacade } from '../../devices/index.js';
import { UsersFacade } from '../../users/index.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import { MfaRecoveryStatus } from '../domain/mfa-recovery.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { VerifyMfa } from './verify-mfa.use-case.js';

/**
 * Recovery of the second factor without a device. It starts from a sign-in that asked for MFA, emails a
 * link and raises an alert; it can only be confirmed after a wait that doubles, up to a cap, with each
 * recovery of the last 90 days, and only within a window after that. A second factor proved meanwhile
 * cancels it. On confirmation the verifiers are retired and the current device is registered.
 */
@Injectable()
export class MfaRecoveryUseCase {
  private static readonly HOUR_MS = 3_600_000;
  private static readonly DAY_MS = 24 * MfaRecoveryUseCase.HOUR_MS;
  private static readonly TOKEN_BYTES = 32;

  constructor(
    private readonly pendings: PendingAuthenticationStore,
    private readonly factors: MfaFactorRepository,
    private readonly users: UsersFacade,
    private readonly devices: DevicesFacade,
    private readonly verify: VerifyMfa,
    private readonly mailer: IdentityMailer,
    private readonly alerts: SecurityAlerts,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly settings: IdentitySettings,
    private readonly clock: Clock,
  ) {}

  /**
   * Starts a recovery for a pending sign-in.
   * @param mfaToken Token of the pending sign-in.
   * @returns When the recovery can be confirmed.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the pending sign-in does not exist.
   */
  async start(mfaToken: string): Promise<MfaRecoveryStarted> {
    const pending = await this.signInPending(mfaToken);
    const now = this.clock.now();
    const token = this.generator
      .bytes(MfaRecoveryUseCase.TOKEN_BYTES)
      .toString('base64url');
    const availableAt = await this.scopes.inUserShard(pending.user, () =>
      this.transactions.runInTransaction(async () => {
        const recent = await this.factors.countRecoveriesSince(
          pending.user.userId,
          new Date(
            now.getTime() -
              IdentityDefaults.mfaRecoveryWindowDays *
                MfaRecoveryUseCase.DAY_MS,
          ),
        );
        const wait =
          this.settings.values.MFA_RECOVERY_BASE_HOURS *
          MfaRecoveryUseCase.HOUR_MS *
          2 ** Math.min(recent, IdentityDefaults.mfaRecoveryMaxDoublings);
        const available = new Date(now.getTime() + wait);
        await this.factors.insertRecovery({
          id: this.ids.next().toString(),
          userId: pending.user.userId,
          tokenHash: this.hasher.digest(token),
          requestedAt: now,
          availableAt: available,
          status: MfaRecoveryStatus.Pending,
        });
        return available;
      }),
    );
    const user = await this.users.getByRef(pending.user);
    await this.mailer.send({
      template: IdentityEmailTemplate.MfaRecoveryLink,
      to: user.email,
      locale: user.locale,
      variables: { token, availableAt: availableAt.toISOString() },
    });
    await this.alerts.raise({
      type: SecurityAlertType.MfaRecoveryStarted,
      user: pending.user,
    });
    return { availableAt: availableAt.toISOString() };
  }

  /**
   * Confirms a recovery whose wait is over and opens the session.
   * @param request Pending sign-in token, emailed token and an optional new device key.
   * @returns The open session.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` if the recovery is unknown, cancelled, expired or done.
   * @throws IdentityError `IDENTITY.MFA.RECOVERY_NOT_READY`, with `Retry-After`, while the wait is not over.
   */
  async confirm(request: MfaRecoveryConfirmRequest): Promise<SignInResponse> {
    const pending = await this.signInPending(request.mfaToken);
    const now = this.clock.now();
    const status = await this.scopes.inUserShard(pending.user, () =>
      this.transactions.runInTransaction(async () => {
        const recovery = await this.factors.findRecoveryByToken(
          pending.user.userId,
          this.hasher.digest(request.token),
        );
        if (
          recovery === undefined ||
          recovery.status !== MfaRecoveryStatus.Pending
        ) {
          throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
        }
        if (now.getTime() < recovery.availableAt.getTime()) {
          throw IdentityError.retryAfter(
            IdentityErrorCode.MfaRecoveryNotReady,
            recovery.availableAt.getTime() - now.getTime(),
          );
        }
        const next =
          now.getTime() >
          recovery.availableAt.getTime() +
            IdentityDefaults.mfaRecoveryConfirmWindowMs
            ? MfaRecoveryStatus.Expired
            : MfaRecoveryStatus.Completed;
        await this.factors.updateRecovery({ ...recovery, status: next });
        return next;
      }),
    );
    if (
      status !== MfaRecoveryStatus.Completed ||
      (await this.pendings.consume(request.mfaToken)) === undefined
    ) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    await this.devices.retireVerifiers(pending.user);
    await this.alerts.raise({
      type: SecurityAlertType.MfaRecoveryCompleted,
      user: pending.user,
    });
    return this.verify.open(
      pending,
      [AuthMethodReference.EmailOtp],
      request.devicePublicKey,
    );
  }

  private async signInPending(
    mfaToken: string,
  ): Promise<PendingAuthentication> {
    const pending = await this.pendings.find(mfaToken);
    if (pending === undefined || pending.purpose !== PendingPurpose.SignIn) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    return pending;
  }
}
