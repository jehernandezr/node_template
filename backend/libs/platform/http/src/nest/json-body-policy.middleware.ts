import { Injectable, type NestMiddleware } from '@nestjs/common';
import { HttpHeader } from '../http-header.enum.js';
import { HttpLimits } from '../http-limits.js';
import { HttpProblemError } from '../http-problem.error.js';
import { JsonBodyReader } from '../json-body-reader.js';
import type { HttpResponseView } from '../http-response-view.js';
import type { PipelineRequest } from './pipeline-request.js';

/** Request with its body as a stream, before reading it. */
interface StreamingRequest extends PipelineRequest, AsyncIterable<Uint8Array> {
  body?: unknown;
}

/**
 * Reads the JSON body of requests that carry one. Rejects sizes and content types the
 * contract does not allow. Runs inside the pipeline so its errors come out with `x-trace-id`.
 */
@Injectable()
export class JsonBodyPolicyMiddleware implements NestMiddleware {
  private static readonly BODY_METHODS: ReadonlySet<string> = new Set([
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ]);

  constructor(private readonly reader: JsonBodyReader) {}

  async use(
    request: StreamingRequest,
    _response: HttpResponseView,
    next: () => void,
  ): Promise<void> {
    if (!JsonBodyPolicyMiddleware.BODY_METHODS.has(request.method)) {
      next();
      return;
    }
    const declared = request.headers[HttpHeader.ContentLength];
    const length = typeof declared === 'string' ? Number(declared) : undefined;
    if (length !== undefined && length > HttpLimits.MAX_BODY_BYTES) {
      throw HttpProblemError.payloadTooLarge();
    }
    const hasBody =
      (length !== undefined && length > 0) ||
      request.headers[HttpHeader.TransferEncoding] !== undefined;
    if (!hasBody) {
      next();
      return;
    }
    if (JsonBodyPolicyMiddleware.mediaType(request) !== 'application/json') {
      throw HttpProblemError.unsupportedMediaType();
    }
    request.body = await this.reader.read(request);
    next();
  }

  private static mediaType(request: PipelineRequest): string {
    const raw = request.headers[HttpHeader.ContentType];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return (value ?? '').split(';')[0]?.trim().toLowerCase() ?? '';
  }
}
