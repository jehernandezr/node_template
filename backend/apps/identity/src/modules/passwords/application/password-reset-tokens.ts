import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator } from '@platform/kernel';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { PasswordResetToken } from '../domain/password-reset-token.js';
import { PasswordReset } from '../domain/password-reset.js';
import { PasswordResetRepository } from '../domain/password-reset.repository.js';

/**
 * Issues and redeems recovery tokens. The row lives in the user's shard and the token carries the route
 * to it; redeeming locks the row, so a token works only once even if it arrives twice at the same time.
 */
@Injectable()
export class PasswordResetTokens {
  private static readonly SECRET_BYTES = 32;

  constructor(
    private readonly resets: PasswordResetRepository,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
    private readonly scopes: IdentityShardScopes,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async issue(user: UserRef): Promise<string> {
    const secret = this.generator.bytes(PasswordResetTokens.SECRET_BYTES);
    const reset = PasswordReset.issue({
      id: this.ids.next().toString(),
      userId: user.userId,
      tokenHash: this.hasher.digest(secret),
      expiresAt: new Date(
        this.clock.now().getTime() + IdentityDefaults.passwordResetTtlMs,
      ),
    });
    await this.scopes.inUserShard(user, () => this.resets.insert(reset));
    return new PasswordResetToken(
      user.userId,
      user.homeTenantId,
      reset.id,
      secret,
    ).format();
  }

  /** The user that owns the token if it is well formed; does not say whether it is valid. */
  ownerOf(text: string): UserRef | undefined {
    const token = PasswordResetToken.parse(text);
    return token === undefined
      ? undefined
      : { userId: token.userId, homeTenantId: token.homeTenantId };
  }

  /**
   * Marks the token as used if it is valid. Runs inside the transaction the caller opens in the user's
   * shard, so the redemption and its effect commit or roll back together.
   * @returns `false` if the token is malformed, does not exist, expired, was already used or its secret does not match.
   */
  async redeem(text: string): Promise<boolean> {
    const token = PasswordResetToken.parse(text);
    if (token === undefined) {
      return false;
    }
    const reset = await this.resets.findForUpdate(token.userId, token.resetId);
    if (
      reset === undefined ||
      !reset.redeem(
        (tokenHash) => this.hasher.matches(token.secret, tokenHash),
        this.clock.now(),
      )
    ) {
      return false;
    }
    await this.resets.update(reset);
    return true;
  }
}
