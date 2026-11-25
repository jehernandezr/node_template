import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ApiGatewayEventBuilder } from '../../__tests__/utils/api-gateway-event.builder.js';
import { ApiGatewayRequestMapper } from '../api-gateway-request-mapper.js';
import { ApiGatewayResponseMapper } from '../api-gateway-response-mapper.js';
import { LoopbackForwarder } from '../loopback-forwarder.js';

/** What the test server returns: what it received, as JSON. */
interface Echo {
  readonly method: string;
  readonly path: string;
  readonly cookie: string | undefined;
  readonly body: string;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

describe('LoopbackForwarder', () => {
  let server: Server;
  let forwarder: LoopbackForwarder;

  beforeAll(async () => {
    server = createServer((request, response) => {
      void readBody(request).then((body) => {
        const echo: Echo = {
          method: request.method ?? '',
          path: request.url ?? '',
          cookie: request.headers.cookie,
          body,
        };
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify(echo));
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address() as AddressInfo;
    forwarder = new LoopbackForwarder(
      `http://127.0.0.1:${port}`,
      new ApiGatewayRequestMapper(),
      new ApiGatewayResponseMapper(),
      globalThis.fetch,
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('carries method, path, query and cookies from the event to the service', async () => {
    const response = await forwarder.forward(
      ApiGatewayEventBuilder.aRequest('GET', '/orders')
        .withQuery('page=2')
        .withCookies(['session=abc', 'theme=dark'])
        .build(),
    );

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body) as Echo).toEqual({
      method: 'GET',
      path: '/orders?page=2',
      cookie: 'session=abc; theme=dark',
      body: '',
    });
  });

  it('sends a base64 POST body as its decoded bytes', async () => {
    const response = await forwarder.forward(
      ApiGatewayEventBuilder.aRequest('POST', '/orders')
        .withBody('aGVsbG8=', true)
        .build(),
    );

    expect(JSON.parse(response.body) as Echo).toMatchObject({
      method: 'POST',
      body: 'hello',
    });
  });

  it('returns the JSON of the service as text with its content type', async () => {
    const response = await forwarder.forward(
      ApiGatewayEventBuilder.aRequest().build(),
    );

    expect(response).toMatchObject({
      headers: { 'content-type': 'application/json' },
      isBase64Encoded: false,
    });
  });

  it('propagates a network error of the fetcher', async () => {
    const failing = new LoopbackForwarder(
      'http://127.0.0.1:1',
      new ApiGatewayRequestMapper(),
      new ApiGatewayResponseMapper(),
      (() => Promise.reject(new TypeError('fetch failed'))) as typeof fetch,
    );

    await expect(
      failing.forward(ApiGatewayEventBuilder.aRequest().build()),
    ).rejects.toBeInstanceOf(TypeError);
  });
});
