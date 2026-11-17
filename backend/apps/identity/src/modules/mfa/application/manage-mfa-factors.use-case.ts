import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  SecurityAlertType,
  type RecoveryCodes,
  type TotpEnrollment,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { encodeBase32 } from '../../../shared/utils/base32.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { UsersFacade } from '../../users/index.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import { SecretBox } from '../domain/secret-box.js';
import { TotpAlgorithm } from '../domain/totp-algorithm.js';

/** TOTP y códigos de recuperación del usuario. Activar, quitar y regenerar piden step-up en la ruta. */
@Injectable()
export class ManageMfaFactors {
  private static readonly TOTP_SECRET_BYTES = 20;
  private static readonly RECOVERY_CODES = 10;
  private static readonly RECOVERY_CODE_HALF = 5;
  private readonly totp = new TotpAlgorithm();

  constructor(
    private readonly factors: MfaFactorRepository,
    private readonly users: UsersFacade,
    private readonly box: SecretBox,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly settings: IdentitySettings,
    private readonly clock: Clock,
  ) {}

  /** Un secreto nuevo sin confirmar; reemplaza a uno anterior sin confirmar. */
  async startTotp(ref: UserRef): Promise<TotpEnrollment> {
    const secret = this.generator.bytes(ManageMfaFactors.TOTP_SECRET_BYTES);
    await this.inUserTransaction(ref, async () => {
      const existing = await this.factors.findTotp(ref.userId);
      if (existing?.confirmedAt !== undefined) {
        throw new IdentityError(IdentityErrorCode.MfaFactorAlreadyEnrolled);
      }
      await this.factors.saveTotp({
        userId: ref.userId,
        encryptedSecret: this.box.seal(secret),
        lastUsedStep: 0,
        ...(existing?.version === undefined
          ? {}
          : { version: existing.version }),
      });
    });
    const user = await this.users.getByRef(ref);
    const issuer = this.settings.values.WEBAUTHN_RP_NAME;
    const encoded = encodeBase32(secret);
    const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}`;
    return {
      secret: encoded,
      otpauthUri: `otpauth://totp/${label}?secret=${encoded}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TotpAlgorithm.DIGITS}&period=${TotpAlgorithm.STEP_SECONDS}`,
    };
  }

  /** Confirma el TOTP con un código de la app y entrega códigos de recuperación nuevos. */
  async confirmTotp(ref: UserRef, code: string): Promise<RecoveryCodes> {
    const codes = this.newRecoveryCodes();
    await this.inUserTransaction(ref, async () => {
      const factor = await this.factors.findTotp(ref.userId);
      if (factor === undefined) {
        throw new IdentityError(IdentityErrorCode.MfaFactorNotEnrolled);
      }
      if (factor.confirmedAt !== undefined) {
        throw new IdentityError(IdentityErrorCode.MfaFactorAlreadyEnrolled);
      }
      const step = this.totp.match(
        this.box.open(factor.encryptedSecret),
        code,
        this.clock.now().getTime(),
      );
      if (step === undefined) {
        throw new IdentityError(IdentityErrorCode.MfaCodeInvalid);
      }
      await this.factors.saveTotp({
        ...factor,
        confirmedAt: this.clock.now(),
        lastUsedStep: step,
      });
      await this.factors.replaceRecoveryCodes(
        ref.userId,
        codes.map((recovery) => this.hasher.digest(recovery)),
      );
    });
    return { codes };
  }

  async removeTotp(ref: UserRef): Promise<void> {
    await this.inUserTransaction(ref, async () => {
      const factor = await this.factors.findTotp(ref.userId);
      if (factor?.confirmedAt === undefined) {
        throw new IdentityError(IdentityErrorCode.MfaFactorNotEnrolled);
      }
      await this.factors.deleteTotp(ref.userId);
    });
    await this.alerts.raise({
      type: SecurityAlertType.MfaFactorRemoved,
      user: ref,
    });
  }

  async regenerateRecoveryCodes(ref: UserRef): Promise<RecoveryCodes> {
    const codes = this.newRecoveryCodes();
    await this.inUserTransaction(ref, () =>
      this.factors.replaceRecoveryCodes(
        ref.userId,
        codes.map((recovery) => this.hasher.digest(recovery)),
      ),
    );
    return { codes };
  }

  private newRecoveryCodes(): string[] {
    return Array.from({ length: ManageMfaFactors.RECOVERY_CODES }, () =>
      [
        this.generator.base32(ManageMfaFactors.RECOVERY_CODE_HALF),
        this.generator.base32(ManageMfaFactors.RECOVERY_CODE_HALF),
      ].join('-'),
    );
  }

  private inUserTransaction<T>(ref: UserRef, fn: () => Promise<T>): Promise<T> {
    return this.scopes.inUserShard(ref, () =>
      this.transactions.runInTransaction(fn),
    );
  }
}
