import {
  HmacSigner,
  InternalApiSignerKind,
  type InternalRequestSigner,
} from '@platform/internal-api';
import type { Clock } from '@platform/kernel';
import type { AwsCredentialsProvider } from '../aws-credentials-provider.js';
import { SigV4Signer } from './sigv4-signer.js';
import type { SigV4SignerSettings } from './sigv4-signer-settings.js';

/** Lo que hace falta para armar cualquiera de los firmadores. */
export interface InternalRequestSignerDependencies {
  /** Secreto del `HmacSigner`; solo se usa con `InternalApiSignerKind.Hmac`. */
  readonly hmacSecret: string;
  readonly clock: Clock;
  /** Credenciales del `SigV4Signer`; solo se usan con `InternalApiSignerKind.SigV4`. */
  readonly credentials: AwsCredentialsProvider;
  readonly sigv4: SigV4SignerSettings;
}

/**
 * Elige el firmador de llamadas internas según `INTERNAL_API_SIGNER`. Vive en
 * el adaptador de AWS porque es el único que conoce los dos firmadores.
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
