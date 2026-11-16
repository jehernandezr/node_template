import { ApiGatewayHeader } from './api-gateway-header.enum.js';
import type { ApiGatewayHttpEvent } from './api-gateway-http-event.js';
import { ApiGatewayMethod } from './api-gateway-method.enum.js';

/**
 * Traduce un evento de API Gateway a una petición `fetch`. Las cabeceras de
 * `host` y `content-length` se quitan porque las pone el cliente HTTP de
 * salida con el destino real.
 */
export class ApiGatewayRequestMapper {
  private static readonly BODYLESS_METHODS: readonly string[] = [
    ApiGatewayMethod.Get,
    ApiGatewayMethod.Head,
  ];

  /**
   * URL del destino, cabeceras e init de `fetch`. La redirección es manual para
   * que la respuesta llegue tal cual al cliente que llamó la función.
   */
  toRequest(
    event: ApiGatewayHttpEvent,
    baseUrl: string,
  ): { url: string; init: RequestInit } {
    const method = event.requestContext.http.method;
    const body = this.bodyOf(event, method);
    return {
      url: this.urlOf(event, baseUrl),
      init: {
        method,
        headers: this.headersOf(event),
        redirect: 'manual',
        ...(body === undefined ? {} : { body }),
      },
    };
  }

  private urlOf(event: ApiGatewayHttpEvent, baseUrl: string): string {
    const query = event.rawQueryString === '' ? '' : `?${event.rawQueryString}`;
    return `${baseUrl.replace(/\/+$/, '')}${event.rawPath}${query}`;
  }

  private headersOf(event: ApiGatewayHttpEvent): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(event.headers ?? {})) {
      if (
        value !== undefined &&
        name !== ApiGatewayHeader.Host &&
        name !== ApiGatewayHeader.ContentLength
      ) {
        headers[name] = value;
      }
    }
    if (event.cookies !== undefined && event.cookies.length > 0) {
      headers[ApiGatewayHeader.Cookie] = event.cookies.join('; ');
    }
    const sourceIp = event.requestContext.http.sourceIp;
    if (sourceIp !== undefined && !(ApiGatewayHeader.ForwardedFor in headers)) {
      headers[ApiGatewayHeader.ForwardedFor] = sourceIp;
    }
    return headers;
  }

  private bodyOf(
    event: ApiGatewayHttpEvent,
    method: string,
  ): string | Buffer | undefined {
    if (
      ApiGatewayRequestMapper.BODYLESS_METHODS.includes(method) ||
      event.body === undefined ||
      event.body === ''
    ) {
      return undefined;
    }
    return event.isBase64Encoded === true
      ? Buffer.from(event.body, 'base64')
      : event.body;
  }
}
