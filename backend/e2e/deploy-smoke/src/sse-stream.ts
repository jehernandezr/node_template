import { HttpHeader } from '@platform/http';
import { SseFrameParser, type SseEvent } from './sse-frame-parser.js';

/** A server-sent event stream of the API, read as it arrives. */
export class SseStream {
  private readonly parser = new SseFrameParser();
  private readonly decoder = new TextDecoder();

  private constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
    private readonly abort: AbortController,
  ) {}

  /**
   * Opens the stream with an access token and checks that the server answers it as `text/event-stream`.
   * @param url Stream URL.
   * @param accessToken Access token of a session.
   * @param lastEventId Event to resume after, so the frames published since then are delivered too.
   * @param fetcher The `fetch` to open it with.
   * @returns The open stream.
   * @throws Error when the server does not answer 200 with an event stream.
   */
  static async open(
    url: URL,
    accessToken: string,
    lastEventId?: string,
    fetcher: typeof fetch = fetch,
  ): Promise<SseStream> {
    const abort = new AbortController();
    const response = await fetcher(url, {
      headers: {
        [HttpHeader.Authorization]: `Bearer ${accessToken}`,
        accept: 'text/event-stream',
        ...(lastEventId === undefined ? {} : { 'last-event-id': lastEventId }),
      },
      signal: abort.signal,
    });
    const type = response.headers.get(HttpHeader.ContentType) ?? '';
    if (
      response.status !== 200 ||
      !type.startsWith('text/event-stream') ||
      response.body === null
    ) {
      abort.abort();
      throw new Error(`${url.pathname} answered ${response.status} ${type}`);
    }
    return new SseStream(response.body.getReader(), abort);
  }

  /**
   * Reads until an event matches.
   * @param matches Whether an event is the awaited one.
   * @param timeoutMs How long to wait.
   * @returns The first matching event.
   * @throws Error when the time runs out or the stream ends first.
   */
  async waitFor(
    matches: (event: SseEvent) => boolean,
    timeoutMs: number,
  ): Promise<SseEvent> {
    let timer: NodeJS.Timeout | undefined;
    const expired = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`No matching event after ${timeoutMs} ms`)),
        timeoutMs,
      );
    });
    try {
      return await Promise.race([this.next(matches), expired]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Closes the stream. */
  close(): void {
    this.abort.abort();
  }

  private async next(matches: (event: SseEvent) => boolean): Promise<SseEvent> {
    for (;;) {
      const { done, value } = await this.reader.read();
      if (done) throw new Error('The event stream ended');
      const found = this.parser
        .push(this.decoder.decode(value, { stream: true }))
        .find(matches);
      if (found !== undefined) return found;
    }
  }
}
