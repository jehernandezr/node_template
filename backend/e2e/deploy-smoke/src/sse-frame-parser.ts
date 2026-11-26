/** One server-sent event: its id when the server sends one, its name and its JSON data. */
export interface SseEvent {
  readonly id?: string;
  readonly event: string;
  readonly data: unknown;
}

/** Splits a `text/event-stream` into events as chunks arrive; comments and the retry hint are skipped. */
export class SseFrameParser {
  private buffer = '';

  /**
   * Adds a chunk and returns the events it completes.
   * @param chunk Text received.
   * @returns The complete events, in order.
   */
  push(chunk: string): SseEvent[] {
    this.buffer += chunk.replace(/\r\n/g, '\n');
    const events: SseEvent[] = [];
    let end = this.buffer.indexOf('\n\n');
    while (end >= 0) {
      const block = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      const event = SseFrameParser.parse(block);
      if (event !== undefined) events.push(event);
      end = this.buffer.indexOf('\n\n');
    }
    return events;
  }

  private static parse(block: string): SseEvent | undefined {
    let event = 'message';
    let id: string | undefined;
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith('id:')) id = line.slice(3).trim();
      if (line.startsWith('event:')) event = line.slice(6).trim();
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
    }
    if (data.length === 0) return undefined;
    const parsed = { event, data: JSON.parse(data.join('\n')) as unknown };
    return id === undefined ? parsed : { id, ...parsed };
  }
}
