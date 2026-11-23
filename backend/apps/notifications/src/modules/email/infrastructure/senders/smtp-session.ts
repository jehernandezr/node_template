import { connect, type Socket } from 'node:net';

/** Una respuesta del servidor SMTP: el código y el texto de sus líneas. */
interface SmtpReply {
  readonly code: number;
  readonly text: string;
}

/**
 * Conversación SMTP sobre una conexión TCP: envía un comando y espera la respuesta completa, que puede venir
 * en varias líneas (`250-...` hasta `250 ...`). Sin autenticación ni TLS: solo para un servidor de desarrollo.
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

  /** @throws Error si el servidor responde con otro código. */
  async command(line: string, expected: number): Promise<SmtpReply> {
    this.socket.write(`${line}\r\n`);
    return this.expect(expected);
  }

  /** Envía el cuerpo de `DATA` ya terminado en CRLF y la línea con el punto final. */
  async data(message: string, expected: number): Promise<SmtpReply> {
    this.socket.write(`${message}.\r\n`);
    return this.expect(expected);
  }

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
