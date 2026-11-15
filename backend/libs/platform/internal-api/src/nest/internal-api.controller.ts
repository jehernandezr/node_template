import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CallOutcome,
  CallOutcomeKind,
  type CallOutcome as Outcome,
} from '@platform/primitives';
import type { SignableRequest } from '../auth/signable-request.js';
import { InternalCallAuthenticator } from '../auth/internal-call-authenticator.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalRouter } from '../server/internal-router.js';
import type { CallMeta } from '../transport/call-meta.js';
import { CallMetaReader } from '../transport/call-meta-reader.js';
import { InternalApiRoute } from '../transport/internal-api-route.js';
import type { InternalRequest } from '../transport/internal-request.js';
import type { InternalResponse } from '../transport/internal-response.js';

/**
 * Borde HTTP de las llamadas entre servicios. No pasa por los guards de
 * autenticación de usuarios: la llamada se autentica con la firma de servicio.
 */
@Controller(InternalApiRoute.BASE)
export class InternalApiController {
  private static readonly METHOD = 'POST';

  constructor(
    private readonly router: InternalRouter,
    private readonly authenticator: InternalCallAuthenticator,
    private readonly metaReader: CallMetaReader,
  ) {}

  /**
   * Responde siempre 200 con `{ outcome }`: el protocolo lleva el resultado en el cuerpo.
   * 1. Normaliza las cabeceras con `metaReader.normalize`.
   * 2. Autentica una `SignableRequest` con método `POST`, ruta `InternalApiRoute.pathOf(operationId)`,
   *    el cuerpo recibido y las cabeceras normalizadas. Una `InternalApiError` `Unauthenticated`
   *    sale como `UnauthorizedException` (401), sin más detalle.
   * 3. El cuerpo debe ser un objeto (`InternalRequest`); la entrada es `body.input`. Si no,
   *    `BadRequestException` (400). Lo mismo si `metaReader.read` lanza `InvalidRequest`.
   * 4. Entrega `router.handle(operationId, input, meta)` y devuelve `{ outcome }` sin el
   *    campo `cause` de un `transient-failure` o un `uncertain`: es un error interno del
   *    servidor y no sale del proceso.
   */
  @Post(':operationId')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Param('operationId') operationId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<InternalResponse> {
    const normalized = this.metaReader.normalize(headers);
    await this.authenticate({
      method: InternalApiController.METHOD,
      path: InternalApiRoute.pathOf(operationId),
      body,
      headers: normalized,
    });
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadRequestException();
    }
    const meta = this.readMeta(normalized);
    const input = (body as InternalRequest).input;
    const outcome = await this.router.handle(operationId, input, meta);
    return { outcome: InternalApiController.withoutCause(outcome) };
  }

  private async authenticate(request: SignableRequest): Promise<void> {
    try {
      await this.authenticator.authenticate(request);
    } catch (error) {
      if (
        error instanceof InternalApiError &&
        error.code === InternalApiErrorCode.Unauthenticated
      ) {
        throw new UnauthorizedException();
      }
      throw error;
    }
  }

  private readMeta(headers: Record<string, string | undefined>): CallMeta {
    try {
      return this.metaReader.read(headers);
    } catch (error) {
      if (
        error instanceof InternalApiError &&
        error.code === InternalApiErrorCode.InvalidRequest
      ) {
        throw new BadRequestException();
      }
      throw error;
    }
  }

  /** `cause` es un error interno y no sale del proceso: el cliente recibe solo el motivo. */
  private static withoutCause(outcome: Outcome<unknown>): Outcome<unknown> {
    switch (outcome.kind) {
      case CallOutcomeKind.TransientFailure:
        return CallOutcome.transientFailure(
          outcome.reason,
          outcome.retryAfterMs === undefined
            ? {}
            : { retryAfterMs: outcome.retryAfterMs },
        );
      case CallOutcomeKind.Uncertain:
        return CallOutcome.uncertain(outcome.reason);
      default:
        return outcome;
    }
  }
}
