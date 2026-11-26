import { connect, type Socket } from 'node:net';

/** A response from the SMTP server: the code and the text of its lines. */
interface SmtpReply {
  readonly code: number;
  readonly text: string;
}

/**
 * SMTP conversation over a TCP connection: sends a command and waits for the full response, which can span
 * several lines (`250-...` up to `250 ...`). No authentication or TLS: only for a development server.
 */
export class SmtpSession {
  private buffer = '';
  private readonly pending: SmtpReply[] = [];
  private waiting: ((reply: SmtpReply) => void) | undefined;
  private failure: Error | undefined;

  private constructor(private readonly socket: Socket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => this.receive(chunk));
    socket.on('error', (error) => {
      this.failure = error;
    });
  }

  /**
   * Connects to the SMTP server and reads its greeting.
   * @param host Server host.
   * @param port Server port.
   * @param timeoutMs Deadline of each reply.
   * @returns The open session.
   */
  static async open(
    host: string,
    port: number,
    timeoutMs: number,
  ): Promise<SmtpSession> {
    const socket = connect({ host, port });
    socket.setTimeout(timeoutMs, () =>
      socket.destroy(new Error('SMTP timeout')),
    );
    const session = new SmtpSession(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('error', reject);
    });
    await session.expect(220);
    return session;
  }

  /**
   * Sends one command line and waits for its reply.
   * @param line Command without CRLF.
   * @param expected Reply code that means success.
   * @returns The reply.
   * @throws Error if the server responds with another code.
   */
  async command(line: string, expected: number): Promise<SmtpReply> {
    this.socket.write(`${line}\r\n`);
    return this.expect(expected);
  }

  /**
   * Sends the `DATA` body already terminated in CRLF and the line with the final dot.
   * @param message Body of the message.
   * @param expected Reply code that means success.
   * @returns The reply.
   */
  async data(message: string, expected: number): Promise<SmtpReply> {
    this.socket.write(`${message}.\r\n`);
    return this.expect(expected);
  }

  /** Closes the connection. */
  close(): void {
    this.socket.end();
  }

  private async expect(code: number): Promise<SmtpReply> {
    const reply = await this.next();
    if (reply.code !== code) {
      throw new Error(`SMTP ${code} expected, got ${reply.code}`);
    }
    return reply;
  }

  private next(): Promise<SmtpReply> {
    const ready = this.pending.shift();
    if (ready !== undefined) {
      return Promise.resolve(ready);
    }
    if (this.failure !== undefined) {
      return Promise.reject(this.failure);
    }
    return new Promise((resolve, reject) => {
      this.waiting = resolve;
      this.socket.once('close', () =>
        reject(this.failure ?? new Error('SMTP connection closed')),
      );
    });
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split('\r\n');
    this.buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) {
        this.deliver({ code: Number(line.slice(0, 3)), text: line.slice(4) });
      }
    }
  }

  private deliver(reply: SmtpReply): void {
    const waiting = this.waiting;
    this.waiting = undefined;
    if (waiting === undefined) {
      this.pending.push(reply);
      return;
    }
    waiting(reply);
  }
}
