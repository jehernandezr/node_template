import type {
  RealtimeFrame,
  StoredFrame,
  StreamUnsubscribe,
} from '@platform/realtime';
import { RealtimeStream } from '@platform/realtime';
import { LuaScript } from '../lua-script.js';
import { ValkeyCommand } from '../valkey-command.enum.js';
import type { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import type { ValkeyKeyspace } from '../valkey-keyspace.js';
import type { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';

/** Retención del stream de cada canal. */
export interface ValkeyRealtimeStreamOptions {
  /** Tramas que se conservan; el recorte es aproximado (`MAXLEN ~`), más barato que el exacto. */
  readonly retained: number;
  /** Vida del stream desde su última trama. */
  readonly ttlMs: number;
}

/**
 * Un Valkey Stream por canal (`<prefijo>:rt:{canal}`) con sus últimas tramas, y un aviso por pub/sub en
 * `<prefijo>:rt-appended:{canal}` cada vez que llega una. Todas las instancias leen el mismo stream, así que
 * un usuario reanuda donde quedó aunque se reconecte a otra.
 */
export class ValkeyRealtimeStream extends RealtimeStream {
  private static readonly FIELD = 'frame';
  private static readonly STREAM_ID = /^\d+-\d+$/;
  /** KEYS[1] stream; ARGV: retención, vida en ms, trama, canal del aviso. */
  private static readonly APPEND = new LuaScript(`
local id = redis.call('XADD', KEYS[1], 'MAXLEN', '~', ARGV[1], '*', '${ValkeyRealtimeStream.FIELD}', ARGV[3])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('PUBLISH', ARGV[4], id)
return id
`);

  private readonly listeners = new Map<string, Set<() => void>>();
  private listening = false;

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly subscribers: ValkeySubscriberSource,
    private readonly keyspace: ValkeyKeyspace,
    private readonly options: ValkeyRealtimeStreamOptions,
  ) {
    super();
  }

  async append(channel: string, frame: RealtimeFrame): Promise<string> {
    const reply = await this.executor.script(
      ValkeyRealtimeStream.APPEND,
      [this.streamKey(channel)],
      [
        this.options.retained,
        this.options.ttlMs,
        JSON.stringify(frame),
        this.noticeChannel(channel),
      ],
    );
    if (typeof reply !== 'string') {
      throw new ValkeyUnexpectedReplyError(
        ValkeyCommand.EvalSha,
        'a stream id',
      );
    }
    return reply;
  }

  async readAfter(
    channel: string,
    afterId: string | undefined,
    limit: number,
  ): Promise<readonly StoredFrame[]> {
    if (afterId !== undefined && !ValkeyRealtimeStream.isStreamId(afterId)) {
      return [];
    }
    const start = afterId === undefined ? '-' : `(${afterId}`;
    const reply = await this.executor.run(ValkeyCommand.Xrange, [
      this.streamKey(channel),
      start,
      '+',
      'COUNT',
      limit,
    ]);
    return ValkeyRealtimeStream.entries(reply, ValkeyCommand.Xrange);
  }

  /** Un id con forma válida pero posterior a la última trama (de otro Valkey o inventado) cuenta como el final. */
  async resumePoint(
    channel: string,
    lastEventId: string | undefined,
  ): Promise<string | undefined> {
    const reply = await this.executor.run(ValkeyCommand.Xrevrange, [
      this.streamKey(channel),
      '+',
      '-',
      'COUNT',
      1,
    ]);
    const last = ValkeyRealtimeStream.entries(reply, ValkeyCommand.Xrevrange)[0]
      ?.id;
    if (
      lastEventId !== undefined &&
      last !== undefined &&
      ValkeyRealtimeStream.isStreamId(lastEventId) &&
      ValkeyRealtimeStream.notAfter(lastEventId, last)
    ) {
      return lastEventId;
    }
    return last;
  }

  async subscribe(
    channel: string,
    onAppend: () => void,
  ): Promise<StreamUnsubscribe> {
    const notice = this.noticeChannel(channel);
    const connection = await this.subscribers.connection();
    this.listen(connection);
    const listener = (): void => onAppend();
    const listeners = this.listeners.get(notice) ?? new Set();
    const first = listeners.size === 0;
    listeners.add(listener);
    this.listeners.set(notice, listeners);
    if (first) {
      await connection.subscribe(notice);
    }
    return async () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(notice);
        await connection.unsubscribe(notice);
      }
    };
  }

  private listen(connection: {
    on(event: 'message', listener: (channel: string) => void): unknown;
  }): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    connection.on('message', (channel) => {
      this.listeners.get(channel)?.forEach((listener) => listener());
    });
  }

  private streamKey(channel: string): string {
    return this.keyspace.key('rt', channel);
  }

  private noticeChannel(channel: string): string {
    return this.keyspace.key('rt-appended', channel);
  }

  private static notAfter(id: string, last: string): boolean {
    const [idMs = 0n, idSeq = 0n] = id.split('-').map(BigInt);
    const [lastMs = 0n, lastSeq = 0n] = last.split('-').map(BigInt);
    return idMs < lastMs || (idMs === lastMs && idSeq <= lastSeq);
  }

  private static isStreamId(id: string): boolean {
    return ValkeyRealtimeStream.STREAM_ID.test(id);
  }

  private static entries(
    reply: unknown,
    command: ValkeyCommand,
  ): StoredFrame[] {
    if (!Array.isArray(reply)) {
      throw new ValkeyUnexpectedReplyError(command, 'an array');
    }
    return reply.map((entry: unknown) => {
      const [id, fields] = entry as [string, string[]];
      const raw = fields[fields.indexOf(ValkeyRealtimeStream.FIELD) + 1];
      if (typeof id !== 'string' || typeof raw !== 'string') {
        throw new ValkeyUnexpectedReplyError(
          command,
          'a stream entry with a frame',
        );
      }
      return { ...(JSON.parse(raw) as RealtimeFrame), id };
    });
  }
}
