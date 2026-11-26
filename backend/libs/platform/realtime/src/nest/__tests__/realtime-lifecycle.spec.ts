import { HttpAdapterHost } from '@nestjs/core';
import type { AbstractHttpAdapter } from '@nestjs/core';
import type { RealtimeHost } from '../../realtime-host.js';
import { RealtimeTransport } from '../../realtime-transport.js';
import { RealtimeLifecycle } from '../realtime-lifecycle.js';
import { RealtimeTransports } from '../realtime-transports.js';

/** A transport that records where it was mounted. */
class RecordingTransport extends RealtimeTransport {
  readonly paths: string[] = [];

  override attach(host: RealtimeHost): void {
    host.get('/stream', () => undefined);
    this.paths.push('/stream');
  }

  override async close(): Promise<void> {}
}

describe('RealtimeLifecycle', () => {
  const lifecycleWith = (
    adapter: AbstractHttpAdapter | null | undefined,
    transport: RecordingTransport,
  ) => {
    const host = new HttpAdapterHost();
    host.httpAdapter = adapter as AbstractHttpAdapter;
    return new RealtimeLifecycle(host, new RealtimeTransports([transport]));
  };

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])(
    'mounts nothing in a worker, whose application context has a %s HTTP adapter',
    (_, adapter) => {
      const transport = new RecordingTransport();

      lifecycleWith(adapter, transport).onModuleInit();

      expect(transport.paths).toEqual([]);
    },
  );
});
