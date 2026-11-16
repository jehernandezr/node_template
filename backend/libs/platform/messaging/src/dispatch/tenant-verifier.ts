import type { MessageEnvelope } from '../envelope/message-envelope.js';

/**
 * Decide si el tenant del sobre es legítimo para este consumidor, por ejemplo
 * que el tenant exista y esté suscrito. `tenantId` es `undefined` cuando el
 * sobre no trae ninguno. Si lanza, el dispatcher lo trata como falla transitoria.
 */
export abstract class TenantVerifier {
  abstract verify(
    tenantId: string | undefined,
    envelope: MessageEnvelope,
  ): Promise<boolean>;
}
