import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  MfaFactor,
  MfaRules,
  type MfaChallenge,
  type MfaChallengeRequest,
} from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityEmailTemplate } from '../../../shared/enums/identity-email-template.enum.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import { IdentityMailer } from '../../alerts/index.js';
import { DevicesFacade } from '../../devices/index.js';
import { UsersFacade } from '../../users/index.js';
import { ChallengeStore } from '../domain/challenge-store.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';

/**
 * Crea un desafío para una autenticación pendiente con uno de los métodos que se ofrecieron. El código del
 * dispositivo aparece en la app de cada verificador; el del email llega por correo. TOTP y códigos de
 * recuperación no envían nada: el usuario ya tiene el código.
 */
@Injectable()
export class RequestMfaChallenge {
  private static readonly MINUTE_MS = 60_000;
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly pendings: PendingAuthenticationStore,
    private readonly challenges: ChallengeStore,
    private readonly devices: DevicesFacade,
    private readonly users: UsersFacade,
    private readonly mailer: IdentityMailer,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    request: MfaChallengeRequest,
    purpose: PendingPurpose,
  ): Promise<MfaChallenge> {
    const pending = await this.pendings.find(request.mfaToken);
    if (pending === undefined || pending.purpose !== purpose) {
      throw new IdentityError(IdentityErrorCode.MfaTokenInvalid);
    }
    if (!pending.offeredFactors.includes(request.method)) {
      throw new IdentityError(IdentityErrorCode.MfaMethodUnavailable);
    }
    const requests = await this.challenges.countRequest(
      pending.id,
      MfaRules.challengeWindowMinutes * RequestMfaChallenge.MINUTE_MS,
    );
    if (requests > MfaRules.maxChallengesPerWindow) {
      throw new IdentityError(IdentityErrorCode.MfaTooManyAttempts);
    }
    return this.issue(pending, request.method);
  }

  private async issue(
    pending: PendingAuthentication,
    method: MfaFactor,
  ): Promise<MfaChallenge> {
    const now = this.clock.now();
    const id = this.ids.next().toString();
    const length = this.codeLength(method);
    const ttlSeconds =
      method === MfaFactor.DeviceOtp
        ? MfaRules.deviceCodeTtlSeconds
        : MfaRules.emailCodeTtlSeconds;
    const expiresAt = new Date(
      now.getTime() + ttlSeconds * RequestMfaChallenge.SECOND_MS,
    );
    const code =
      length === undefined ? undefined : this.generator.digits(length);
    await this.challenges.save({
      id,
      pendingId: pending.id,
      method,
      ...(code === undefined ? {} : { codeHash: this.hasher.digest(code) }),
      expiresAt,
    });
    if (code !== undefined) {
      await this.deliver(pending, method, { id, code, now, expiresAt });
    }
    return {
      challengeId: id,
      method,
      expiresAt: expiresAt.toISOString(),
      ...(length === undefined ? {} : { codeLength: length }),
    };
  }

  private async deliver(
    pending: PendingAuthentication,
    method: MfaFactor,
    challenge: { id: string; code: string; now: Date; expiresAt: Date },
  ): Promise<void> {
    if (method === MfaFactor.EmailOtp) {
      const user = await this.users.getByRef(pending.user);
      await this.mailer.send({
        template: IdentityEmailTemplate.MfaCode,
        to: user.email,
        locale: user.locale,
        variables: { code: challenge.code },
      });
      return;
    }
    for (const device of await this.devices.verifiers(pending.user)) {
      await this.devices.enqueueApproval(device.id, {
        challengeId: challenge.id,
        code: challenge.code,
        requestedAt: challenge.now.toISOString(),
        expiresAt: challenge.expiresAt.toISOString(),
        context: {
          ...(pending.client.userAgent === undefined
            ? {}
            : { browser: pending.client.userAgent.slice(0, 120) }),
          ...(pending.client.ip === ''
            ? {}
            : { ip: pending.client.ip.slice(0, 120) }),
        },
      });
    }
  }

  private codeLength(method: MfaFactor): number | undefined {
    switch (method) {
      case MfaFactor.DeviceOtp:
        return MfaRules.deviceCodeLength;
      case MfaFactor.EmailOtp:
        return MfaRules.emailCodeLength;
      default:
        return undefined;
    }
  }
}
