import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuthMethodReference, MfaFactor } from '@contracts/identity';
import { ClientChannel } from '@platform/http';
import { EphemeralStore } from '../../../ephemeral/ephemeral-store.js';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityCacheKey } from '../../../shared/enums/identity-cache-key.enum.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';

const PendingSchema = z.object({
  id: z.string(),
  user: z.object({ userId: z.string(), homeTenantId: z.string() }),
  purpose: z.enum(PendingPurpose),
  deviceId: z.string().optional(),
  offeredFactors: z.array(z.enum(MfaFactor)),
  sessionId: z.string().optional(),
  client: z.object({
    ip: z.string(),
    userAgent: z.string().optional(),
    channel: z.enum(ClientChannel),
  }),
  authMethods: z.array(z.enum(AuthMethodReference)),
  expiresAt: z.coerce.date(),
});

/** `mfaToken` `mf1_<secret>` and its pending authentication in Valkey, under the token's hash. */
@Injectable()
export class EphemeralPendingAuthenticationStore extends PendingAuthenticationStore {
  private static readonly PREFIX = 'mf1_';
  private static readonly TOKEN_BYTES = 32;

  constructor(
    private readonly store: EphemeralStore,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
  ) {
    super();
  }

  async save(pending: PendingAuthentication): Promise<string> {
    const token =
      EphemeralPendingAuthenticationStore.PREFIX +
      this.generator
        .bytes(EphemeralPendingAuthenticationStore.TOKEN_BYTES)
        .toString('base64url');
    await this.store.set(
      this.keyOf(token),
      JSON.stringify(pending),
      IdentityDefaults.pendingAuthenticationTtlMs,
    );
    return token;
  }

  async find(mfaToken: string): Promise<PendingAuthentication | undefined> {
    return this.parse(await this.store.get(this.keyOf(mfaToken)));
  }

  async consume(mfaToken: string): Promise<PendingAuthentication | undefined> {
    return this.parse(await this.store.take(this.keyOf(mfaToken)));
  }

  private parse(raw: string | undefined): PendingAuthentication | undefined {
    if (raw === undefined) {
      return undefined;
    }
    const parsed = PendingSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  }

  private keyOf(token: string): string {
    return [
      IdentityCacheKey.PendingAuthentication,
      this.hasher.digest(token),
    ].join(':');
  }
}
