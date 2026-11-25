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
 * HTTP edge of service-to-service calls. It does not go through the user
 * authentication guards: the call is authenticated with the service signature.
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
   * Always responds 200 with `{ outcome }`: the protocol carries the result in the body.
   * 1. Normalizes the headers with `metaReader.normalize`.
   * 2. Authenticates a `SignableRequest` with method `POST`, path `InternalApiRoute.pathOf(operationId)`,
   *    the received body and the normalized headers. An `InternalApiError` `Unauthenticated`
   *    goes out as `UnauthorizedException` (401), with no further detail.
   * 3. The body must be an object (`InternalRequest`); the input is `body.input`. Otherwise,
   *    `BadRequestException` (400). The same if `metaReader.read` throws `InvalidRequest`.
   * 4. Delivers `router.handle(operationId, input, meta)` and returns `{ outcome }` without the
   *    `cause` field of a `transient-failure` or an `uncertain`: it is an internal server error
   *    and does not leave the process.
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

  /** `cause` is an internal error and does not leave the process: the client receives only the reason. */
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
