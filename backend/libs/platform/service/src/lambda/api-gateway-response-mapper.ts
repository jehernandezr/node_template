import { ApiGatewayHeader } from './api-gateway-header.enum.js';
import type { ApiGatewayHttpResponse } from './api-gateway-http-response.js';

/**
 * Translates the `fetch` response into the API Gateway shape. Textual content travels as
 * UTF-8 text and the rest as base64, so no binary gets corrupted when
 * going through JSON.
 */
export class ApiGatewayResponseMapper {
  private static readonly TEXT_CONTENT = {
    prefixes: ['text/'],
    types: ['application/json', 'application/javascript', 'application/xml'],
    suffixes: ['+json', '+xml'],
  } as const;

  /** Reads the whole body; the `set-cookie` headers go separately because they cannot be joined with a comma. */
  async fromResponse(response: Response): Promise<ApiGatewayHttpResponse> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      if (name !== ApiGatewayHeader.SetCookie) {
        headers[name] = value;
      }
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    const common = {
      statusCode: response.status,
      headers,
      cookies: response.headers.getSetCookie(),
    };
    if (bytes.length === 0) {
      return { ...common, body: '', isBase64Encoded: false };
    }
    const contentType = response.headers.get(ApiGatewayHeader.ContentType);
    if (ApiGatewayResponseMapper.isTextual(contentType)) {
      return {
        ...common,
        body: bytes.toString('utf8'),
        isBase64Encoded: false,
      };
    }
    return { ...common, body: bytes.toString('base64'), isBase64Encoded: true };
  }

  private static isTextual(contentType: string | null): boolean {
    if (contentType === null) {
      return false;
    }
    const mediaType = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
    const { prefixes, types, suffixes } = ApiGatewayResponseMapper.TEXT_CONTENT;
    return (
      prefixes.some((prefix) => mediaType.startsWith(prefix)) ||
      (types as readonly string[]).includes(mediaType) ||
      suffixes.some((suffix) => mediaType.endsWith(suffix))
    );
  }
}
