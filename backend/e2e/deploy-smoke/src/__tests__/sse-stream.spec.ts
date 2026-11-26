import { SseStream } from '../sse-stream.js';
import { LocalApi } from './utils/index.js';

describe('SseStream', () => {
  const api = new LocalApi((_, response) => {
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write('retry: 3000\n\n');
    response.write('event: unread-count\ndata: {"count":1}\n\n');
    setTimeout(
      () =>
        response.write(
          'event: notification\ndata: {"type":"security_alert"}\n\n',
        ),
      20,
    );
  });
  let base: URL;

  beforeAll(async () => {
    base = await api.start();
  });

  afterAll(() => api.stop());

  it('opens with the token and the resume point and returns the first matching event', async () => {
    const stream = await SseStream.open(
      new URL('/stream', base),
      'access',
      '5-0',
    );

    try {
      await expect(
        stream.waitFor((frame) => frame.event === 'notification', 2_000),
      ).resolves.toEqual({
        event: 'notification',
        data: { type: 'security_alert' },
      });
    } finally {
      stream.close();
    }
    expect(api.received.at(-1)?.headers).toMatchObject({
      authorization: 'Bearer access',
      'last-event-id': '5-0',
    });
  });

  it('fails when no event matches in time', async () => {
    const stream = await SseStream.open(new URL('/stream', base), 'access');

    try {
      await expect(stream.waitFor(() => false, 100)).rejects.toThrow(
        'No matching event after 100 ms',
      );
    } finally {
      stream.close();
    }
  });

  it('fails when the stream ends before a match', async () => {
    api.answer((_, response) => {
      response.writeHead(200, { 'content-type': 'text/event-stream' });
      response.end('data: {}\n\n');
    });
    const stream = await SseStream.open(new URL('/stream', base), 'access');

    await expect(stream.waitFor(() => false, 2_000)).rejects.toThrow(
      'The event stream ended',
    );
  });

  it('refuses an answer that is not an event stream', async () => {
    api.answer((_, response) => {
      response.writeHead(401, { 'content-type': 'application/problem+json' });
      response.end('{}');
    });

    await expect(
      SseStream.open(new URL('/stream', base), 'expired'),
    ).rejects.toThrow('/stream answered 401 application/problem+json');
  });
});
