import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import type { DispatchOptions } from './dispatch-options.js';
import type { TenantVerifier } from './tenant-verifier.js';

/** Checks the envelope tenant against the expected one and against the verifier. */
export class TenantGate {
  constructor(
    private readonly expectedTenantId: string | undefined,
    private readonly verifier: TenantVerifier | undefined,
  ) {}

  /**
   * Returns the rejection (`TenantMismatch`) or `undefined` to accept. Without
   * `expectedTenantId` or a verifier, an envelope that names a tenant is
   * rejected: nothing proves the producer may act on it. If the
   * verifier throws, the error propagates as is.
   * @param envelope Delivered envelope.
   * @param options Dispatch options.
   * @returns The rejection, or `undefined`.
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
