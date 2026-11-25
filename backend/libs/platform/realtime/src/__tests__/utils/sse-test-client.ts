import { request, type ClientRequest, type IncomingMessage } from 'node:http';
import type { ReceivedFrame } from './received-frame.js';

/** Test SSE client: opens the stream, stores each event and notifies when the server closes it. */
export class SseTestClient {
  readonly frames: ReceivedFrame[] = [];
  status = 0;
  ended = false;
  body = '';
  private pending = '';
  private outgoing: ClientRequest | undefined;

  async open(url: string, headers: Record<string, string>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.outgoing = request(url, { headers }, (response) => {
        this.status = response.statusCode ?? 0;
        this.read(response);
        resolve();
      });
      this.outgoing.on('error', reject);
      this.outgoing.end();
    });
  }

  lastEventId(): string | undefined {
    return this.frames.at(-1)?.id;
  }

  close(): void {
    this.outgoing?.destroy();
  }

  private read(response: IncomingMessage): void {
    response.setEncoding('utf8');
    response.on('data', (chunk: string) => {
      this.body += chunk;
      this.pending += chunk;
      this.parse();
    });
    response.on('end', () => {
      this.ended = true;
    });
  }

  private parse(): void {
    const blocks = this.pending.split('\n\n');
    this.pending = blocks.pop() ?? '';
    for (const block of blocks) {
      const fields = new Map(
        block
          .split('\n')
          .filter((line) => !line.startsWith(':') && line.includes(': '))
          .map((line) => [
            line.slice(0, line.indexOf(': ')),
            line.slice(line.indexOf(': ') + 2),
          ]),
      );
      const id = fields.get('id');
      if (id !== undefined) {
        this.frames.push({
          id,
          type: fields.get('event') ?? 'message',
          data: JSON.parse(fields.get('data') ?? 'null') as unknown,
        });
      }
    }
  }
}
