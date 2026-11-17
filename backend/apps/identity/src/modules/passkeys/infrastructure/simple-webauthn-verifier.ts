import { Injectable } from '@nestjs/common';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { z } from 'zod';
import { IdentitySettings } from '../../../config/identity-settings.js';
import type { Passkey } from '../domain/passkey.js';
import {
  WebAuthnVerifier,
  type VerifiedAssertion,
  type VerifiedRegistration,
} from '../domain/webauthn-verifier.js';

const CredentialSchema = z.looseObject({
  id: z.string().min(1).max(1024),
  rawId: z.string().min(1).max(1024),
  type: z.literal('public-key'),
  response: z.looseObject({ clientDataJSON: z.string().min(1) }),
  clientExtensionResults: z.looseObject({}).default({}),
});

/** La respuesta trae la forma de una credencial de WebAuthn; la biblioteca valida el resto. */
function isCredential(
  value: unknown,
): value is RegistrationResponseJSON & AuthenticationResponseJSON {
  return CredentialSchema.safeParse(value).success;
}

/**
 * WebAuthn con `@simplewebauthn/server`: CBOR, claves COSE y formatos de atestación no se implementan en
 * casa. Atestación `none`; `rpID`, nombre y orígenes salen de la configuración.
 */
@Injectable()
export class SimpleWebAuthnVerifier extends WebAuthnVerifier {
  constructor(private readonly settings: IdentitySettings) {
    super();
  }

  registrationOptions(input: {
    challenge: string;
    userId: string;
    userName: string;
    exclude: readonly Passkey[];
  }): Promise<unknown> {
    return generateRegistrationOptions({
      rpName: this.settings.values.WEBAUTHN_RP_NAME,
      rpID: this.settings.values.WEBAUTHN_RP_ID,
      userName: input.userName,
      userID: Buffer.from(input.userId),
      // En bytes: con un texto la biblioteca codificaría sus bytes UTF-8 y el desafío ya no coincidiría.
      challenge: Buffer.from(input.challenge, 'base64url'),
      attestationType: 'none',
      excludeCredentials: input.exclude.map((passkey) => ({
        id: passkey.credentialId,
        transports: [...passkey.transports],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  authenticationOptions(input: {
    challenge: string;
    allow: readonly Passkey[];
  }): Promise<unknown> {
    return generateAuthenticationOptions({
      rpID: this.settings.values.WEBAUTHN_RP_ID,
      challenge: Buffer.from(input.challenge, 'base64url'),
      userVerification: 'preferred',
      allowCredentials: input.allow.map((passkey) => ({
        id: passkey.credentialId,
        transports: [...passkey.transports],
      })),
    });
  }

  async verifyRegistration(
    response: unknown,
    challenge: string,
  ): Promise<VerifiedRegistration | undefined> {
    if (!isCredential(response)) {
      return undefined;
    }
    try {
      const result = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: [...this.settings.values.WEBAUTHN_ORIGINS],
        expectedRPID: this.settings.values.WEBAUTHN_RP_ID,
        requireUserVerification: false,
      });
      if (!result.verified) {
        return undefined;
      }
      const info = result.registrationInfo;
      return {
        credentialId: info.credential.id,
        publicKey: Buffer.from(info.credential.publicKey).toString('base64url'),
        signCount: info.credential.counter,
        transports: info.credential.transports ?? [],
        aaguid: info.aaguid,
        backedUp: info.credentialBackedUp,
      };
    } catch {
      return undefined;
    }
  }

  async verifyAuthentication(
    response: unknown,
    challenge: string,
    passkey: Passkey,
  ): Promise<VerifiedAssertion | undefined> {
    if (!isCredential(response)) {
      return undefined;
    }
    try {
      const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: [...this.settings.values.WEBAUTHN_ORIGINS],
        expectedRPID: this.settings.values.WEBAUTHN_RP_ID,
        credential: {
          id: passkey.credentialId,
          publicKey: Buffer.from(passkey.publicKey, 'base64url'),
          counter: passkey.signCount,
          transports: [...passkey.transports],
        },
        requireUserVerification: false,
      });
      return result.verified
        ? {
            newSignCount: result.authenticationInfo.newCounter,
            userVerified: result.authenticationInfo.userVerified,
          }
        : undefined;
    } catch {
      return undefined;
    }
  }

  credentialIdOf(response: unknown): string | undefined {
    const parsed = CredentialSchema.safeParse(response);
    return parsed.success ? parsed.data.id : undefined;
  }
}
