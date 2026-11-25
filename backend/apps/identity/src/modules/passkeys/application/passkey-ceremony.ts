import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, type PasskeyOptions } from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { decodeBase64Url } from '../../../shared/utils/base64url.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { Passkey } from '../domain/passkey.js';
import { PasskeyRepository } from '../domain/passkey-store.js';
import type {
  WebAuthnChallenge,
  WebAuthnPurpose,
} from '../domain/webauthn-challenge.js';
import { WebAuthnChallengeStore } from '../domain/webauthn-challenge-store.js';
import { WebAuthnVerifier } from '../domain/webauthn-verifier.js';

/**
 * The common steps of a WebAuthn ceremony: issue a challenge, read the browser's response
 * (base64url of a JSON) and verify an assertion against the stored passkey, with its signature counter.
 */
@Injectable()
export class PasskeyCeremony {
  private static readonly CHALLENGE_BYTES = 32;

  constructor(
    private readonly challenges: WebAuthnChallengeStore,
    private readonly passkeys: PasskeyRepository,
    private readonly webauthn: WebAuthnVerifier,
    private readonly generator: SecretGenerator,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async begin(
    purpose: WebAuthnPurpose,
    user: UserRef | undefined,
    options: (challenge: string) => Promise<unknown>,
  ): Promise<PasskeyOptions> {
    const challenge: WebAuthnChallenge = {
      id: this.ids.next().toString(),
      challenge: this.generator
        .bytes(PasskeyCeremony.CHALLENGE_BYTES)
        .toString('base64url'),
      purpose,
      ...(user === undefined
        ? {}
        : { userId: user.userId, homeTenantId: user.homeTenantId }),
    };
    await this.challenges.save(challenge);
    return {
      challengeId: challenge.id,
      optionsJson: Buffer.from(
        JSON.stringify(await options(challenge.challenge)),
      ).toString('base64url'),
    };
  }

  /** @throws IdentityError `IDENTITY.PASSKEY.CHALLENGE_EXPIRED` if the challenge does not exist, expired or is for another use. */
  async take(
    challengeId: string,
    purpose: WebAuthnPurpose,
  ): Promise<WebAuthnChallenge> {
    const challenge = await this.challenges.consume(challengeId);
    if (challenge === undefined || challenge.purpose !== purpose) {
      throw new IdentityError(IdentityErrorCode.PasskeyChallengeExpired);
    }
    return challenge;
  }

  /** @throws IdentityError `IDENTITY.PASSKEY.VERIFICATION_FAILED` if it is not base64url JSON. */
  credential(credentialJson: string): unknown {
    try {
      return JSON.parse(decodeBase64Url(credentialJson).toString('utf8'));
    } catch {
      throw PasskeyCeremony.failed();
    }
  }

  credentialIdOf(credential: unknown): string {
    const id = this.webauthn.credentialIdOf(credential);
    if (id === undefined) {
      throw PasskeyCeremony.failed();
    }
    return id;
  }

  /**
   * Verifies the assertion and saves the new counter and the last use. Returns whether there was user verification.
   * @throws IdentityError `IDENTITY.PASSKEY.VERIFICATION_FAILED` if the passkey is not the user's or does not verify.
   */
  async assert(
    user: UserRef,
    credential: unknown,
    challenge: string,
  ): Promise<boolean> {
    const credentialId = this.credentialIdOf(credential);
    return this.scopes.inUserShard(user, () =>
      this.transactions.runInTransaction(async () => {
        const passkey = await this.passkeys.findByCredential(
          user.userId,
          credentialId,
        );
        if (passkey === undefined) {
          throw PasskeyCeremony.failed();
        }
        const verified = await this.webauthn.verifyAuthentication(
          credential,
          challenge,
          passkey,
        );
        if (verified === undefined) {
          throw PasskeyCeremony.failed();
        }
        await this.passkeys.update({
          ...passkey,
          signCount: verified.newSignCount,
          lastUsedAt: this.clock.now(),
        });
        return verified.userVerified;
      }),
    );
  }

  userPasskeys(user: UserRef): Promise<readonly Passkey[]> {
    return this.scopes.inUserShard(user, () => this.passkeys.list(user.userId));
  }

  static failed(): IdentityError {
    return new IdentityError(IdentityErrorCode.PasskeyVerificationFailed);
  }
}
