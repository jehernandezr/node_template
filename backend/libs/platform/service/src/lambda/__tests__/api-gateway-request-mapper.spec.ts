import { ApiGatewayEventBuilder } from '../../__tests__/utils/api-gateway-event.builder.js';
import { ApiGatewayRequestMapper } from '../api-gateway-request-mapper.js';

const BASE_URL = 'https://billing.internal.example.test/';

describe('ApiGatewayRequestMapper', () => {
  const mapper = new ApiGatewayRequestMapper();

  it('builds the URL from the base without trailing slash and the raw path', () => {
    const { url } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest().build(),
      BASE_URL,
    );

    expect(url).toBe('https://billing.internal.example.test/greeting');
  });

  it('appends the raw query string when it is not empty', () => {
    const { url } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest().withQuery('a=1&b=2').build(),
      BASE_URL,
    );

    expect(url).toBe('https://billing.internal.example.test/greeting?a=1&b=2');
  });

  it('joins the cookies with a semicolon into one cookie header', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest().withCookies(['a=1', 'b=2']).build(),
      BASE_URL,
    );

    expect(init.headers).toMatchObject({ cookie: 'a=1; b=2' });
  });

  it('decodes a base64 body into bytes', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest('POST')
        .withBody('aGVsbG8=', true)
        .build(),
      BASE_URL,
    );

    expect(Buffer.isBuffer(init.body)).toBe(true);
    expect(Buffer.from(init.body as Buffer).toString('utf8')).toBe('hello');
  });

  it('passes a plain text body as it is', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest('POST').withBody('{"a":1}').build(),
      BASE_URL,
    );

    expect(init.body).toBe('{"a":1}');
  });

  it('omits the body of a GET request', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest('GET').withBody('ignored').build(),
      BASE_URL,
    );

    expect(init).not.toHaveProperty('body');
  });

  it('omits the body of a HEAD request', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest('HEAD').withBody('ignored').build(),
      BASE_URL,
    );

    expect(init).not.toHaveProperty('body');
  });

  it('omits the body when the event has an empty one', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest('POST').withBody('').build(),
      BASE_URL,
    );

    expect(init).not.toHaveProperty('body');
  });

  it('removes host and content-length and keeps the rest of the headers', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest('POST')
        .withHeaders({
          host: 'public.example.test',
          'content-length': '2',
          'content-type': 'application/json',
          'x-tenant-id': 'tenant-1',
          'x-empty': undefined,
        })
        .build(),
      BASE_URL,
    );

    expect(init.headers).toEqual({
      'content-type': 'application/json',
      'x-tenant-id': 'tenant-1',
    });
  });

  it('adds x-forwarded-for from the source IP when the event has none', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest().withSourceIp('203.0.113.7').build(),
      BASE_URL,
    );

    expect(init.headers).toMatchObject({ 'x-forwarded-for': '203.0.113.7' });
  });

  it('keeps an existing x-forwarded-for instead of the source IP', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest()
        .withHeaders({ 'x-forwarded-for': '198.51.100.1' })
        .withSourceIp('203.0.113.7')
        .build(),
      BASE_URL,
    );

    expect(init.headers).toMatchObject({ 'x-forwarded-for': '198.51.100.1' });
  });

  it('asks fetch not to follow redirects', () => {
    const { init } = mapper.toRequest(
      ApiGatewayEventBuilder.aRequest().build(),
      BASE_URL,
    );

    expect(init.redirect).toBe('manual');
  });
});
