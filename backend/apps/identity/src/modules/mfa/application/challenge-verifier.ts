import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  MfaFactor,
  MfaRules,
  SecurityAlertType,
  type AuthMethodReference,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { RateLimitRule, RateLimiter } from '@platform/rate-limit';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { LockoutRules } from '../../../shared/constants/lockout.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { ChallengeStore } from '../domain/challenge-store.js';
import { MfaAttemptRule } from '../domain/mfa-attempt-rule.enum.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import { SecretBox } from '../domain/secret-box.js';
import { TotpAlgorithm } from '../domain/totp-algorithm.js';
import { MfaMethodCatalog } from './mfa-method-catalog.js';

/**
 * Verifies the code of a challenge: five attempts at most per challenge, a single use, and a per-user cap on
 * wrong codes across every challenge, so a stolen session cannot guess a TOTP code by opening challenge
 * after challenge. Returns the method satisfied, to add it to the session `amr`.
 */
@Injectable()
export class ChallengeVerifier {
  private static readonly USER_FAILURES = RateLimitRule.define({
    name: MfaAttemptRule.User,
    limit: LockoutRules.mfa.maxFailures,
    windowMs: LockoutRules.mfa.windowMs,
  });
  private readonly totp = new TotpAlgorithm();

  constructor(
    private readonly challenges: ChallengeStore,
    private readonly factors: MfaFactorRepository,
    private readonly methods: MfaMethodCatalog,
    private readonly box: SecretBox,
    private readonly hasher: SecretHasher,
    private readonly alerts: SecurityAlerts,
    private readonly limiter: RateLimiter,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly clock: Clock,
  ) {}

  /**
   * Verifies the code of a challenge of a pending authentication.
   * @param pending Pending authentication that owns the challenge.
   * @param challengeId Challenge.
   * @param code Code typed by the user.
   * @returns The method reference the challenge satisfied.
   * @throws IdentityError `IDENTITY.MFA.CODE_EXPIRED` if the challenge is unknown, expired or used.
   * @throws IdentityError `IDENTITY.MFA.TOO_MANY_ATTEMPTS`, with `Retry-After` when the user cap applies.
   * @throws IdentityError `IDENTITY.MFA.CODE_INVALID` for a wrong code.
   */
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
    const user = pending.user.userId;
    const budget = await this.limiter.peek(
      user,
      ChallengeVerifier.USER_FAILURES,
    );
    if (!budget.allowed) {
      throw IdentityError.retryAfter(
        IdentityErrorCode.MfaTooManyAttempts,
        budget.retryAfterMs,
      );
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
      await this.limiter.consume(user, ChallengeVerifier.USER_FAILURES);
      throw new IdentityError(IdentityErrorCode.MfaCodeInvalid);
    }
    await this.limiter.reset(user, ChallengeVerifier.USER_FAILURES);
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
