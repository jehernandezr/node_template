import { ApiGatewayResponseMapper } from '../api-gateway-response-mapper.js';

describe('ApiGatewayResponseMapper', () => {
  const mapper = new ApiGatewayResponseMapper();

  it('returns text as UTF-8 without base64', async () => {
    const mapped = await mapper.fromResponse(
      new Response('hola', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }),
    );

    expect(mapped).toEqual({
      statusCode: 200,
      headers: expect.objectContaining({
        'content-type': 'text/plain; charset=utf-8',
      }),
      cookies: [],
      body: 'hola',
      isBase64Encoded: false,
    });
  });

  it('returns JSON as UTF-8 without base64', async () => {
    const mapped = await mapper.fromResponse(
      new Response('{"a":1}', {
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(mapped.body).toBe('{"a":1}');
    expect(mapped.isBase64Encoded).toBe(false);
  });

  it('treats a structured JSON media type as text', async () => {
    const mapped = await mapper.fromResponse(
      new Response('{"a":1}', {
        headers: { 'content-type': 'application/problem+json' },
      }),
    );

    expect(mapped.isBase64Encoded).toBe(false);
  });

  it('encodes binary content in base64', async () => {
    const mapped = await mapper.fromResponse(
      new Response(Uint8Array.from([0x00, 0xff, 0x10]), {
        headers: { 'content-type': 'application/octet-stream' },
      }),
    );

    expect(mapped.body).toBe('AP8Q');
    expect(mapped.isBase64Encoded).toBe(true);
  });

  it('returns an empty body for a response with no content', async () => {
    const mapped = await mapper.fromResponse(
      new Response(null, { status: 204 }),
    );

    expect(mapped).toMatchObject({
      statusCode: 204,
      body: '',
      isBase64Encoded: false,
    });
  });

  it('moves each set-cookie to cookies and keeps it out of headers', async () => {
    const mapped = await mapper.fromResponse(
      new Response('ok', {
        headers: [
          ['set-cookie', 'a=1; Path=/'],
          ['set-cookie', 'b=2; HttpOnly'],
          ['content-type', 'text/plain'],
        ],
      }),
    );

    expect(mapped.cookies).toEqual(['a=1; Path=/', 'b=2; HttpOnly']);
    expect(mapped.headers).not.toHaveProperty('set-cookie');
    expect(mapped.headers).toMatchObject({ 'content-type': 'text/plain' });
  });
});
