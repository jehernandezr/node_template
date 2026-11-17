import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  MfaFactor,
  MfaRules,
  SecurityAlertType,
  type AuthMethodReference,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { ChallengeStore } from '../domain/challenge-store.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import { SecretBox } from '../domain/secret-box.js';
import { TotpAlgorithm } from '../domain/totp-algorithm.js';
import { MfaMethodCatalog } from './mfa-method-catalog.js';

/**
 * Verifica el código de un desafío: cinco intentos como máximo y un solo uso. Devuelve el método que quedó
 * cumplido para sumarlo al `amr` de la sesión.
 */
@Injectable()
export class ChallengeVerifier {
  private readonly totp = new TotpAlgorithm();

  constructor(
    private readonly challenges: ChallengeStore,
    private readonly factors: MfaFactorRepository,
    private readonly methods: MfaMethodCatalog,
    private readonly box: SecretBox,
    private readonly hasher: SecretHasher,
    private readonly alerts: SecurityAlerts,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  async verify(
    pending: PendingAuthentication,
    challengeId: string,
    code: string,
  ): Promise<AuthMethodReference> {
    const challenge = await this.challenges.find(challengeId);
    if (challenge === undefined || challenge.pendingId !== pending.id) {
      throw new IdentityError(IdentityErrorCode.MfaCodeExpired);
    }
    if (challenge.expiresAt.getTime() <= this.clock.now().getTime()) {
      throw new IdentityError(IdentityErrorCode.MfaCodeExpired);
    }
    if (
      (await this.challenges.attempt(challengeId)) >
      MfaRules.maxAttemptsPerChallenge
    ) {
      throw new IdentityError(IdentityErrorCode.MfaTooManyAttempts);
    }
    const valid =
      challenge.codeHash !== undefined
        ? this.hasher.matches(code, challenge.codeHash)
        : await this.verifyFactor(pending, challenge.method, code);
    if (!valid) {
      throw new IdentityError(IdentityErrorCode.MfaCodeInvalid);
    }
    if (!(await this.challenges.consume(challengeId))) {
      throw new IdentityError(IdentityErrorCode.MfaCodeExpired);
    }
    if (challenge.method === MfaFactor.RecoveryCode) {
      await this.alerts.raise({
        type: SecurityAlertType.RecoveryCodeUsed,
        user: pending.user,
      });
    }
    return this.methods.amrOf(challenge.method);
  }

  private verifyFactor(
    pending: PendingAuthentication,
    method: MfaFactor,
    code: string,
  ): Promise<boolean> {
    const user = pending.user;
    return this.scopes.inUserShard(user, () =>
      this.transactions.runInTransaction(async () => {
        if (method === MfaFactor.RecoveryCode) {
          return this.factors.useRecoveryCode(
            user.userId,
            this.hasher.digest(code.trim().toUpperCase()),
            this.clock.now(),
          );
        }
        const factor = await this.factors.findTotp(user.userId);
        if (factor?.confirmedAt === undefined) {
          return false;
        }
        const step = this.totp.match(
          this.box.open(factor.encryptedSecret),
          code,
          this.clock.now().getTime(),
        );
        if (step === undefined || step <= factor.lastUsedStep) {
          return false;
        }
        await this.factors.saveTotp({ ...factor, lastUsedStep: step });
        return true;
      }),
    );
  }
}
