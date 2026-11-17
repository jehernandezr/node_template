import { Injectable } from '@nestjs/common';
import { AuthMethodReference, MfaFactor } from '@contracts/identity';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { DevicesFacade } from '../../devices/index.js';
import { PasskeysFacade } from '../../passkeys/index.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';

/**
 * Qué segundos factores tiene un usuario. Con un dispositivo verificador el código va a su app y no se
 * ofrece el email; TOTP y códigos de recuperación, solo si están activos; la passkey, si tiene alguna.
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
    private readonly scopes: IdentityShardScopes,
  ) {}

  async offered(user: UserRef): Promise<MfaFactor[]> {
    const verifiers = await this.devices.verifiers(user);
    const { totp, recoveryCodes } = await this.scopes.inUserShard(
      user,
      async () => ({
        totp: await this.factors.findTotp(user.userId),
        recoveryCodes: await this.factors.countRecoveryCodes(user.userId),
      }),
    );
    return [
      verifiers.length > 0 ? MfaFactor.DeviceOtp : MfaFactor.EmailOtp,
      ...(totp?.confirmedAt === undefined ? [] : [MfaFactor.Totp]),
      ...(recoveryCodes > 0 ? [MfaFactor.RecoveryCode] : []),
      ...((await this.passkeys.hasPasskeys(user)) ? [MfaFactor.Passkey] : []),
    ];
  }

  amrOf(method: MfaFactor): AuthMethodReference {
    return MfaMethodCatalog.AMR[method];
  }
}
