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
 * Recuperación del segundo factor sin dispositivo. Empieza con un inicio de sesión que pidió MFA, envía un
 * enlace por email y alerta; solo se confirma pasada una espera que se duplica con cada recuperación de los
 * últimos 90 días. Al confirmar, los verificadores se retiran y el dispositivo actual queda registrado.
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
          2 ** recent;
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

  async confirm(request: MfaRecoveryConfirmRequest): Promise<SignInResponse> {
    const pending = await this.signInPending(request.mfaToken);
    const now = this.clock.now();
    await this.scopes.inUserShard(pending.user, () =>
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
        await this.factors.updateRecovery({
          ...recovery,
          status: MfaRecoveryStatus.Completed,
        });
      }),
    );
    await this.pendings.consume(request.mfaToken);
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
