import { HttpHeader } from '@platform/http';
import { SseFrameParser, type SseEvent } from './sse-frame-parser.js';

/**
 * A server-sent event stream of the API, read as it arrives. Like a browser, it reconnects with the id of the last
 * event when the server ends the stream, for example after a frame that closes every session of the user.
 */
export class SseStream {
  private static readonly LAST_EVENT_ID = 'last-event-id';
  private readonly abort = new AbortController();
  private readonly decoder = new TextDecoder();
  private parser = new SseFrameParser();
  private reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  private constructor(
    private readonly url: URL,
    private readonly accessToken: string,
    private lastEventId: string | undefined,
    private readonly fetcher: typeof fetch,
  ) {}

  /**
   * The `Last-Event-ID` that resumes the stream from an instant. It relies on the ids of the Valkey realtime stream,
   * `<milliseconds>-<sequence>`, which the server accepts as a resume point: with another id format the server starts
   * at the end and the frames published before the stream opens are missed.
   * @param instantMs Instant to resume from, in epoch milliseconds.
   * @returns The event id.
   */
  static resumeIdAt(instantMs: number): string {
    return `${Math.trunc(instantMs)}-0`;
  }

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
    const stream = new SseStream(url, accessToken, lastEventId, fetcher);
    await stream.connect();
    return stream;
  }

  /**
   * Reads until an event matches.
   * @param matches Whether an event is the awaited one.
   * @param timeoutMs How long to wait.
   * @returns The first matching event.
   * @throws Error when the time runs out or a reconnection is refused.
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

  private async connect(): Promise<void> {
    const response = await this.fetcher(this.url, {
      headers: {
        [HttpHeader.Authorization]: `Bearer ${this.accessToken}`,
        accept: 'text/event-stream',
        ...(this.lastEventId === undefined
          ? {}
          : { [SseStream.LAST_EVENT_ID]: this.lastEventId }),
      },
      signal: this.abort.signal,
    });
    const type = response.headers.get(HttpHeader.ContentType) ?? '';
    if (
      response.status !== 200 ||
      !type.startsWith('text/event-stream') ||
      response.body === null
    ) {
      await response.body?.cancel();
      throw new Error(
        `${this.url.pathname} answered ${response.status} ${type}`,
      );
    }
    this.parser = new SseFrameParser();
    this.reader = response.body.getReader();
  }

  private async next(matches: (event: SseEvent) => boolean): Promise<SseEvent> {
    for (;;) {
      const read = await this.reader?.read();
      if (read === undefined || read.done) {
        await this.connect();
        continue;
      }
      for (const event of this.parser.push(
        this.decoder.decode(read.value, { stream: true }),
      )) {
        if (event.id !== undefined) this.lastEventId = event.id;
        if (matches(event)) return event;
      }
    }
  }
}
