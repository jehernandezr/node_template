import { SseFrameParser } from '../sse-frame-parser.js';

describe('SseFrameParser', () => {
  it('returns each event once its blank line arrives, across chunks', () => {
    const parser = new SseFrameParser();

    const first = parser.push(
      'retry: 3000\n\nid: 1-0\nevent: notification\nda',
    );
    const second = parser.push(
      'ta: {"type":"security_alert"}\n\n: keep-alive\n\n',
    );

    expect(first).toEqual([]);
    expect(second).toEqual([
      { event: 'notification', data: { type: 'security_alert' } },
    ]);
  });

  it('names an event without `event:` a message and joins its data lines', () => {
    expect(new SseFrameParser().push('data: [1,\r\ndata: 2]\r\n\r\n')).toEqual([
      { event: 'message', data: [1, 2] },
    ]);
  });
});
