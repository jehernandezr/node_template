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

  /**
   * Starts a WebAuthn ceremony: stores its challenge and builds its options.
   * @param purpose Registration, sign-in or second factor.
   * @param user User of the ceremony, unknown for a discoverable sign-in.
   * @param options Builds the options for the challenge.
   * @returns The options with their challenge id.
   */
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

  /**
   * Takes a stored challenge once.
   * @param challengeId Challenge of the ceremony.
   * @param purpose Expected purpose.
   * @returns The challenge.
   * @throws IdentityError `IDENTITY.PASSKEY.CHALLENGE_EXPIRED` if the challenge does not exist, expired or is for another use.
   */
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

  /**
   * Decodes the credential the client sent.
   * @param credentialJson Base64url JSON.
   * @returns The credential.
   * @throws IdentityError `IDENTITY.PASSKEY.VERIFICATION_FAILED` if it is not base64url JSON.
   */
  credential(credentialJson: string): unknown {
    try {
      return JSON.parse(decodeBase64Url(credentialJson).toString('utf8'));
    } catch {
      throw PasskeyCeremony.failed();
    }
  }

  /**
   * Reads the credential id of an assertion.
   * @param credential Decoded assertion.
   * @returns The credential id.
   */
  credentialIdOf(credential: unknown): string {
    const id = this.webauthn.credentialIdOf(credential);
    if (id === undefined) {
      throw PasskeyCeremony.failed();
    }
    return id;
  }

  /**
   * Verifies the assertion and saves the new counter and the last use. Returns whether there was user verification.
   * @param user Owner of the passkey.
   * @param credential Decoded assertion.
   * @param challenge Expected challenge.
   * @returns Whether the user was verified.
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

  /**
   * Lists the passkeys of a user.
   * @param user Owner.
   * @returns Its passkeys.
   */
  userPasskeys(user: UserRef): Promise<readonly Passkey[]> {
    return this.scopes.inUserShard(user, () => this.passkeys.list(user.userId));
  }

  /**
   * Builds the error of a failed verification.
   * @returns The `IDENTITY.PASSKEY.VERIFICATION_FAILED` error.
   */
  static failed(): IdentityError {
    return new IdentityError(IdentityErrorCode.PasskeyVerificationFailed);
  }
}
