import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import type { DispatchOptions } from './dispatch-options.js';
import type { TenantVerifier } from './tenant-verifier.js';

/** Comprueba el tenant del sobre contra el esperado y contra el verificador. */
export class TenantGate {
  constructor(
    private readonly expectedTenantId: string | undefined,
    private readonly verifier: TenantVerifier | undefined,
  ) {}

  /**
   * Devuelve el rechazo (`TenantMismatch`) o `undefined` para aceptar. Sin
   * `expectedTenantId` ni verificador, un sobre que nombra un tenant se
   * rechaza: nada prueba que el productor pueda actuar sobre él. Si el
   * verificador lanza, el error sale tal cual.
   */
  async check(
    envelope: MessageEnvelope,
    options: DispatchOptions,
  ): Promise<MessagingError | undefined> {
    const expected = options.expectedTenantId ?? this.expectedTenantId;
    const tenant = envelope.tenantid;

    if (expected !== undefined && tenant !== expected) {
      return new MessagingError(
        MessagingErrorCode.TenantMismatch,
        'envelope tenant does not match the subscription tenant',
      );
    }
    if (this.verifier) {
      return (await this.verifier.verify(tenant, envelope))
        ? undefined
        : new MessagingError(
            MessagingErrorCode.TenantMismatch,
            'envelope tenant was rejected by the tenant verifier',
          );
    }
    if (expected !== undefined || tenant === undefined) {
      return undefined;
    }
    return new MessagingError(
      MessagingErrorCode.TenantMismatch,
      'envelope tenant cannot be verified: configure expectedTenantId or verifyTenant',
    );
  }
}
