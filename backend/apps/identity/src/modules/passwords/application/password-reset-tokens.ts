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
 * Emite y canjea los tokens de recuperación. La fila vive en el shard del usuario y el token lleva la ruta
 * hasta ella; canjear bloquea la fila, así que un token sirve una sola vez aunque llegue dos veces a la vez.
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

  /** El usuario dueño del token si es bien formado; no dice si sirve. */
  ownerOf(text: string): UserRef | undefined {
    const token = PasswordResetToken.parse(text);
    return token === undefined
      ? undefined
      : { userId: token.userId, homeTenantId: token.homeTenantId };
  }

  /**
   * Marca el token como usado si sirve. Corre dentro de la transacción que abre el llamador en el shard del
   * usuario, para que el canje y su efecto se confirmen o se deshagan juntos.
   * @returns `false` si el token está mal formado, no existe, venció, ya se usó o su secreto no coincide.
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
