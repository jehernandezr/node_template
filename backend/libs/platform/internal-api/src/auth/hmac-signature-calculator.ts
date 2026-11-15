import { createHmac } from 'node:crypto';
import { CanonicalJson } from '@platform/primitives';
import { InternalHeader } from '../transport/internal-header.enum.js';
import type { SignableRequest } from './signable-request.js';

/**
 * Calcula la firma HMAC-SHA256 de una llamada. El firmador y el autenticador
 * la comparten para que no puedan divergir.
 *
 * El texto firmado une, separados por salto de línea: método, ruta, instante,
 * huella del cuerpo y las cabeceras que cambian el significado de la llamada
 * (tenant, actor, llave de idempotencia, plazo y traza). Una cabecera ausente
 * cuenta como texto vacío.
 */
export class HmacSignatureCalculator {
  private static readonly SIGNED_HEADERS: readonly InternalHeader[] = [
    InternalHeader.TenantId,
    InternalHeader.ActorId,
    InternalHeader.IdempotencyKey,
    InternalHeader.Deadline,
    InternalHeader.Traceparent,
  ];

  constructor(private readonly secret: string) {}

  /** Firma en hexadecimal de `request` para el instante `timestampMs`. */
  sign(request: SignableRequest, timestampMs: number): string {
    return createHmac('sha256', this.secret)
      .update(this.signedText(request, timestampMs))
      .digest('hex');
  }

  private signedText(request: SignableRequest, timestampMs: number): string {
    return [
      request.method,
      request.path,
      String(timestampMs),
      CanonicalJson.digest(request.body),
      ...HmacSignatureCalculator.SIGNED_HEADERS.map(
        (name) => request.headers[name] ?? '',
      ),
    ].join('\n');
  }
}
