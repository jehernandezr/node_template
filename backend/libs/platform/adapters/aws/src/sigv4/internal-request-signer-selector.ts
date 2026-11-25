import {
  HmacSigner,
  InternalApiSignerKind,
  type InternalRequestSigner,
} from '@platform/internal-api';
import type { Clock } from '@platform/kernel';
import type { AwsCredentialsProvider } from '../aws-credentials-provider.js';
import { SigV4Signer } from './sigv4-signer.js';
import type { SigV4SignerSettings } from './sigv4-signer-settings.js';

/** What is needed to build any of the signers. */
export interface InternalRequestSignerDependencies {
  /** Secret of the `HmacSigner`; only used with `InternalApiSignerKind.Hmac`. */
  readonly hmacSecret: string;
  readonly clock: Clock;
  /** Credentials of the `SigV4Signer`; only used with `InternalApiSignerKind.SigV4`. */
  readonly credentials: AwsCredentialsProvider;
  readonly sigv4: SigV4SignerSettings;
}

/**
 * Chooses the internal call signer according to `INTERNAL_API_SIGNER`. Lives in
 * the AWS adapter because it is the only one that knows both signers.
 */
export class InternalRequestSignerSelector {
  select(
    kind: InternalApiSignerKind,
    dependencies: InternalRequestSignerDependencies,
  ): InternalRequestSigner {
    switch (kind) {
      case InternalApiSignerKind.Hmac:
        return new HmacSigner(dependencies.hmacSecret, dependencies.clock);
      case InternalApiSignerKind.SigV4:
        return new SigV4Signer(
          dependencies.sigv4,
          dependencies.credentials,
          dependencies.clock,
        );
    }
  }
}
