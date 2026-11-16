import { ApiGatewayHeader } from './api-gateway-header.enum.js';
import type { ApiGatewayHttpResponse } from './api-gateway-http-response.js';

/**
 * Traduce la respuesta `fetch` a la forma de API Gateway. Lo textual viaja como
 * texto UTF-8 y lo demás en base64, para que ningún binario se corrompa al
 * pasar por JSON.
 */
export class ApiGatewayResponseMapper {
  private static readonly TEXT_CONTENT = {
    prefixes: ['text/'],
    types: ['application/json', 'application/javascript', 'application/xml'],
    suffixes: ['+json', '+xml'],
  } as const;

  /** Lee el cuerpo entero; las `set-cookie` van aparte porque no se pueden unir con coma. */
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
