import {
  ErrorAudience,
  PlatformErrorCode,
  ProblemDetailsFactory,
  type ErrorCatalogEntry,
} from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { HttpProblemError } from './http-problem.error.js';
import { HttpHeader } from './http-header.enum.js';
import type { ProblemResponse } from './problem-response.js';
import type { ErrorCatalogRegistry } from './error-catalog-registry.js';

/**
 * Convierte cualquier error de la petición en Problem Details. Solo sale el título del catálogo: nunca
 * el `message` ni el `detail` del error. Lo que no está en el catálogo es `PLATFORM.INTERNAL.UNEXPECTED`.
 */
export class ProblemDetailsMapper {
  constructor(
    private readonly registry: ErrorCatalogRegistry,
    private readonly factory: ProblemDetailsFactory,
  ) {}

  map(
    error: unknown,
    context: { readonly instance: string; readonly traceId?: string },
  ): ProblemResponse {
    const entry = this.entryOf(error);
    const errors =
      error instanceof HttpProblemError ? error.fieldErrors : undefined;
    const body = this.factory.create({
      entry,
      title: entry.description,
      instance: context.instance,
      traceId: context.traceId,
      errors,
    });
    const headers: Record<string, string> = {
      [HttpHeader.ContentType]: 'application/problem+json',
    };
    const retryAfter = this.retryAfter(error, entry);
    if (retryAfter !== undefined) {
      headers[HttpHeader.RetryAfter] = String(retryAfter);
    }
    return { status: body.status, body, headers };
  }

  private entryOf(error: unknown): ErrorCatalogEntry {
    const unexpected = this.registry.get(PlatformErrorCode.InternalUnexpected);
    if (!PlatformError.is(error)) {
      return ProblemDetailsMapper.require(unexpected);
    }
    return (
      this.registry.get(error.code) ?? ProblemDetailsMapper.require(unexpected)
    );
  }

  /** Segundos enteros ≥ 1, desde la fuente que tenga valor; solo para códigos públicos. */
  private retryAfter(
    error: unknown,
    entry: ErrorCatalogEntry,
  ): number | undefined {
    if (entry.audience !== ErrorAudience.Public) {
      return undefined;
    }
    const seconds = ProblemDetailsMapper.retryAfterSeconds(error);
    if (seconds === undefined) {
      return undefined;
    }
    return Math.max(1, Math.ceil(seconds));
  }

  private static retryAfterSeconds(error: unknown): number | undefined {
    if (
      error instanceof HttpProblemError &&
      error.retryAfterSeconds !== undefined
    ) {
      return error.retryAfterSeconds;
    }
    if (!PlatformError.is(error) || error.details === undefined) {
      return undefined;
    }
    const seconds = error.details['retryAfterSeconds'];
    if (typeof seconds === 'number') {
      return seconds;
    }
    const millis = error.details['retryAfterMs'];
    return typeof millis === 'number' ? millis / 1000 : undefined;
  }

  private static require(
    entry: ErrorCatalogEntry | undefined,
  ): ErrorCatalogEntry {
    if (entry === undefined) {
      throw new Error('Falta PLATFORM.INTERNAL.UNEXPECTED en el catálogo');
    }
    return entry;
  }
}
