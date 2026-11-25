import { Injectable, type NestMiddleware } from '@nestjs/common';
import { SecurityHeaders } from '../security-headers.js';
import type { HttpResponseView } from '../http-response-view.js';
import type { PipelineRequest } from './pipeline-request.js';

/** Writes the security headers of each response, including error responses. */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(
    request: PipelineRequest,
    response: HttpResponseView,
    next: () => void,
  ): void {
    for (const [name, value] of Object.entries(
      SecurityHeaders.forPath(request.path),
    )) {
      response.setHeader(name, value);
    }
    next();
  }
}
