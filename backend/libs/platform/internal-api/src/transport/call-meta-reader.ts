import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { CallMeta } from './call-meta.js';
import { InternalHeader } from './internal-header.enum.js';

/** Lee de las cabeceras HTTP de una llamada entrante el `CallMeta` que el servidor entrega al router. */
export class CallMetaReader {
  /**
   * Cabeceras con el nombre en minúscula y un solo valor por cabecera: de un
   * arreglo toma el primero y descarta lo que no sea texto.
   */
  normalize(
    raw: Readonly<Record<string, string | string[] | undefined>>,
  ): Record<string, string | undefined> {
    const normalized: Record<string, string | undefined> = {};
    for (const [name, value] of Object.entries(raw)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (typeof single === 'string') {
        normalized[name.toLowerCase()] = single;
      }
    }
    return normalized;
  }

  /**
   * `idempotencyKey` de `x-idempotency-key` (obligatoria), `deadline` de `x-call-deadline` y
   * `timeoutMs` de `x-call-timeout-ms` (números finitos, obligatorios), y `traceparent`,
   * `tenantId` y `actorId` si vienen. No pone `signal`.
   * @throws InternalApiError `InvalidRequest` si falta una cabecera obligatoria o un número no es finito.
   */
  read(headers: Readonly<Record<string, string | undefined>>): CallMeta {
    const traceparent = headers[InternalHeader.Traceparent];
    const tenantId = headers[InternalHeader.TenantId];
    const actorId = headers[InternalHeader.ActorId];
    return {
      idempotencyKey: CallMetaReader.required(
        headers,
        InternalHeader.IdempotencyKey,
      ),
      deadline: CallMetaReader.finite(headers, InternalHeader.Deadline),
      timeoutMs: CallMetaReader.finite(headers, InternalHeader.TimeoutMs),
      ...(traceparent !== undefined && { traceparent }),
      ...(tenantId !== undefined && { tenantId }),
      ...(actorId !== undefined && { actorId }),
    };
  }

  private static required(
    headers: Readonly<Record<string, string | undefined>>,
    name: InternalHeader,
  ): string {
    const value = headers[name];
    if (value === undefined || value.trim() === '') {
      throw CallMetaReader.malformed();
    }
    return value;
  }

  private static finite(
    headers: Readonly<Record<string, string | undefined>>,
    name: InternalHeader,
  ): number {
    const value = Number(CallMetaReader.required(headers, name));
    if (!Number.isFinite(value)) {
      throw CallMetaReader.malformed();
    }
    return value;
  }

  /** El mensaje no dice qué cabecera falta ni qué valor llegó. */
  private static malformed(): InternalApiError {
    return new InternalApiError(
      InternalApiErrorCode.InvalidRequest,
      'The internal call headers are malformed',
    );
  }
}
