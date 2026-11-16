import type { ApiGatewayHttpEvent } from '../../lambda/api-gateway-http-event.js';

/** Arma un evento de API Gateway con formato de carga 2.0; cada `with*` cambia un campo. */
export class ApiGatewayEventBuilder {
  private event: {
    version: string;
    rawPath: string;
    rawQueryString: string;
    headers?: Record<string, string | undefined>;
    cookies?: string[];
    requestContext: {
      requestId: string;
      http: { method: string; sourceIp?: string };
    };
    body?: string;
    isBase64Encoded?: boolean;
  };

  private constructor(method: string, rawPath: string) {
    this.event = {
      version: '2.0',
      rawPath,
      rawQueryString: '',
      requestContext: {
        requestId: 'request-1',
        http: { method },
      },
    };
  }

  static aRequest(
    method = 'GET',
    rawPath = '/greeting',
  ): ApiGatewayEventBuilder {
    return new ApiGatewayEventBuilder(method, rawPath);
  }

  withQuery(rawQueryString: string): this {
    this.event.rawQueryString = rawQueryString;
    return this;
  }

  withHeaders(headers: Record<string, string | undefined>): this {
    this.event.headers = headers;
    return this;
  }

  withCookies(cookies: string[]): this {
    this.event.cookies = cookies;
    return this;
  }

  withSourceIp(sourceIp: string): this {
    this.event.requestContext.http.sourceIp = sourceIp;
    return this;
  }

  withBody(body: string, isBase64Encoded = false): this {
    this.event.body = body;
    this.event.isBase64Encoded = isBase64Encoded;
    return this;
  }

  build(): ApiGatewayHttpEvent {
    return { ...this.event };
  }
}
