import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { AuthMethodReference, MfaFactor } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { DevicesFacade } from '../../devices/index.js';
import { PasskeysFacade } from '../../passkeys/index.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';

/**
 * Which second factors a user has. With a verifier device the code goes to its app and email is not
 * offered; TOTP and recovery codes only if active; the passkey if the user has one. A factor that already
 * counted as the first one is never offered again.
 */
@Injectable()
export class MfaMethodCatalog {
  private static readonly AMR: Readonly<
    Record<MfaFactor, AuthMethodReference>
  > = {
    [MfaFactor.DeviceOtp]: AuthMethodReference.Device,
    [MfaFactor.EmailOtp]: AuthMethodReference.EmailOtp,
    [MfaFactor.Totp]: AuthMethodReference.Totp,
    [MfaFactor.RecoveryCode]: AuthMethodReference.RecoveryCode,
    [MfaFactor.Passkey]: AuthMethodReference.Passkey,
  };

  constructor(
    private readonly devices: DevicesFacade,
    private readonly passkeys: PasskeysFacade,
    private readonly factors: MfaFactorRepository,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * Lists the second factors the user can use.
   * @param user User who must present a second factor.
   * @param satisfied Methods that already counted in this authentication; their factors are left out.
   * @returns The offered factors.
   */
  async offered(
    user: UserRef,
    satisfied: readonly AuthMethodReference[] = [],
  ): Promise<MfaFactor[]> {
    const verifiers = await this.devices.verifiers(user);
    const { totp, recoveryCodes } = await this.scopes.inUserShard(
      user,
      async () => ({
        totp: await this.factors.findTotp(user.userId),
        recoveryCodes: await this.factors.countRecoveryCodes(user.userId),
      }),
    );
    const factors = [
      verifiers.length > 0 ? MfaFactor.DeviceOtp : MfaFactor.EmailOtp,
      ...(totp?.confirmedAt === undefined ? [] : [MfaFactor.Totp]),
      ...(recoveryCodes > 0 ? [MfaFactor.RecoveryCode] : []),
      ...((await this.passkeys.hasPasskeys(user)) ? [MfaFactor.Passkey] : []),
    ];
    return factors.filter((factor) => !satisfied.includes(this.amrOf(factor)));
  }

  /**
   * Maps a second factor to the `amr` value it adds to the session.
   * @param method Verified factor.
   * @returns Its authentication method reference.
   */
  amrOf(method: MfaFactor): AuthMethodReference {
    return MfaMethodCatalog.AMR[method];
  }
}
