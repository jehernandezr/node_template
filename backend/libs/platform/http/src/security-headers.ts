import { HttpHeader } from './http-header.enum.js';
import { HttpLimits } from './http-limits.js';

/** Security headers of every response. Auth routes are also never cached. */
export class SecurityHeaders {
  static forPath(path: string): Record<string, string> {
    const headers: Record<string, string> = {
      [HttpHeader.StrictTransportSecurity]:
        'max-age=63072000; includeSubDomains',
      [HttpHeader.ContentTypeOptions]: 'nosniff',
      [HttpHeader.ReferrerPolicy]: 'no-referrer',
      [HttpHeader.ContentSecurityPolicy]: "default-src 'none'",
    };
    if (path.startsWith(HttpLimits.NO_STORE_PATH_PREFIX)) {
      headers[HttpHeader.CacheControl] = 'no-store';
    }
    return headers;
  }
}
