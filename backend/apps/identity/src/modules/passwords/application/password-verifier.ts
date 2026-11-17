import { Injectable } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { PasswordCredentialRepository } from '../domain/password-credential.repository.js';
import { PasswordHasher } from '../domain/password-hasher.js';

/**
 * Verifica contraseñas. Sin usuario compara contra un hash fijo, así que un email inexistente cuesta lo
 * mismo que uno real. Un hash con parámetros viejos se rehace después de una verificación correcta.
 */
@Injectable()
export class PasswordVerifier {
  private static readonly DECOY = 'identity-decoy-password-value';
  private decoy: Promise<string> | undefined;

  constructor(
    private readonly credentials: PasswordCredentialRepository,
    private readonly hasher: PasswordHasher,
    private readonly scopes: IdentityShardScopes,
    private readonly clock: Clock,
  ) {}

  async verify(ref: UserRef | undefined, password: string): Promise<boolean> {
    if (ref === undefined) {
      await this.hasher.verify(password, await this.decoyHash());
      return false;
    }
    return this.scopes.inUserShard(ref, async () => {
      const credential = await this.credentials.find(ref.userId);
      if (credential === undefined) {
        await this.hasher.verify(password, await this.decoyHash());
        return false;
      }
      const ok = await this.hasher.verify(password, credential.hash);
      if (ok && this.hasher.needsRehash(credential.hash)) {
        await this.credentials.save({
          ...credential,
          hash: await this.hasher.hash(password),
          changedAt: credential.changedAt,
        });
      }
      return ok;
    });
  }

  /** Guarda la contraseña nueva en la transacción y el shard que ya abrió quien llama. */
  async store(ref: UserRef, password: string): Promise<void> {
    const existing = await this.credentials.find(ref.userId);
    await this.credentials.save({
      userId: ref.userId,
      hash: await this.hasher.hash(password),
      changedAt: this.clock.now(),
      ...(existing?.version === undefined ? {} : { version: existing.version }),
    });
  }

  private decoyHash(): Promise<string> {
    this.decoy ??= this.hasher.hash(PasswordVerifier.DECOY);
    return this.decoy;
  }
}
