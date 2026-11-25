import { Injectable } from '@nestjs/common';
import { Jwks } from '@contracts/identity';
import { JwkCodec } from '@platform/auth';
import { UseCase } from '@platform/kernel';
import { SigningKeyProvider } from '../domain/signing-key-provider.js';

/** The JWKS with the active and verification public keys. */
@Injectable()
export class GetJwks implements UseCase<void, Jwks> {
  constructor(private readonly keys: SigningKeyProvider) {}

  async execute(): Promise<Jwks> {
    return {
      keys: this.keys
        .ring()
        .published()
        .map((key) => ({ ...JwkCodec.toPublicJwk(key.publicKey, key.kid) })),
    };
  }
}
