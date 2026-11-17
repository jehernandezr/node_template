import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import {
  WebAuthnPurpose,
  type WebAuthnChallenge,
} from '../domain/webauthn-challenge.js';
import { WebAuthnChallengeStore } from '../domain/webauthn-challenge-store.js';

const ChallengeSchema = z.object({
  id: z.string(),
  challenge: z.string(),
  purpose: z.enum(WebAuthnPurpose),
  userId: z.string().optional(),
  homeTenantId: z.string().optional(),
});

/** Desafíos de WebAuthn en Valkey; consumirlos es un `GETDEL`. */
@Injectable()
export class EphemeralWebAuthnChallengeStore extends WebAuthnChallengeStore {
  constructor(private readonly store: EphemeralStore) {
    super();
  }

  async save(challenge: WebAuthnChallenge): Promise<void> {
    await this.store.set(
      this.keyOf(challenge.id),
      JSON.stringify(challenge),
      IdentityDefaults.webAuthnChallengeTtlMs,
    );
  }

  async consume(challengeId: string): Promise<WebAuthnChallenge | undefined> {
    const raw = await this.store.take(this.keyOf(challengeId));
    if (raw === undefined) {
      return undefined;
    }
    const parsed = ChallengeSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  }

  private keyOf(challengeId: string): string {
    return [IdentityCacheKey.WebAuthnChallenge, challengeId].join(':');
  }
}
