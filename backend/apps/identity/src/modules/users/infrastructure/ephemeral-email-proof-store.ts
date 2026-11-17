import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import {
  EmailProofStore,
  type EmailProofPurpose,
} from '../domain/email-proof-store.js';
import type { PendingEmailProof } from '../domain/pending-email-proof.js';

const ProofSchema = z.object({
  userId: z.string(),
  homeTenantId: z.string(),
  email: z.string(),
});

/** Tokens de email en Valkey bajo la huella del token: quien lee Valkey no puede usar un token guardado. */
@Injectable()
export class EphemeralEmailProofStore extends EmailProofStore {
  private static readonly TOKEN_BYTES = 32;

  constructor(
    private readonly store: EphemeralStore,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
  ) {
    super();
  }

  async issue(
    purpose: EmailProofPurpose,
    proof: PendingEmailProof,
  ): Promise<string> {
    const token = this.generator
      .bytes(EphemeralEmailProofStore.TOKEN_BYTES)
      .toString('base64url');
    await this.store.set(
      this.keyOf(purpose, token),
      JSON.stringify(proof),
      IdentityDefaults.emailVerificationTtlMs,
    );
    return token;
  }

  async consume(
    purpose: EmailProofPurpose,
    token: string,
  ): Promise<PendingEmailProof | undefined> {
    const raw = await this.store.take(this.keyOf(purpose, token));
    if (raw === undefined) {
      return undefined;
    }
    const parsed = ProofSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  }

  private keyOf(purpose: EmailProofPurpose, token: string): string {
    return [
      IdentityCacheKey.EmailVerification,
      purpose,
      this.hasher.digest(token),
    ].join(':');
  }
}
