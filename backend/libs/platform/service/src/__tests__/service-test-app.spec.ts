import { HttpApplicationConfigurer } from '../nest/bootstrap/http-application-configurer.js';
import { ServiceDefinitionBuilder } from './utils/service-definition.builder.js';
import { ServiceTestApp } from './utils/service-test-app.js';
import { ServiceTestServers } from './utils/service-test-servers.js';
import type { TestServer } from './utils/test-server.js';

class NoHttpSetup extends HttpApplicationConfigurer {
  configure(): Promise<void> {
    return Promise.resolve();
  }
}

class StopLog {
  readonly stopped: string[] = [];
}

class RecordingServers extends ServiceTestServers {
  constructor(private readonly log: StopLog) {
    super('stop-probe');
  }

  override stop(): Promise<void> {
    this.log.stopped.push('servers');
    return Promise.resolve();
  }
}

class RecordingPeer implements TestServer {
  constructor(
    private readonly name: string,
    private readonly log: StopLog,
    private readonly failure?: Error,
  ) {}

  start(): Promise<void> {
    return Promise.resolve();
  }

  stop(): Promise<void> {
    this.log.stopped.push(this.name);
    return this.failure === undefined
      ? Promise.resolve()
      : Promise.reject(this.failure);
  }
}

describe('ServiceTestApp', () => {
  it('stops the peers in reverse order and the databases last', async () => {
    const log = new StopLog();
    const app = new ServiceTestApp({
      definition: ServiceDefinitionBuilder.aDefinition().build(),
      servers: new RecordingServers(log),
      configurer: new NoHttpSetup(),
      peers: [
        new RecordingPeer('first', log),
        new RecordingPeer('second', log),
      ],
    });

    await app.stop();

    expect(log.stopped).toEqual(['second', 'first', 'servers']);
  });

  it('still stops everything else when a peer fails to stop, and reports the failure', async () => {
    const log = new StopLog();
    const failure = new Error('peer did not stop');
    const app = new ServiceTestApp({
      definition: ServiceDefinitionBuilder.aDefinition().build(),
      servers: new RecordingServers(log),
      configurer: new NoHttpSetup(),
      peers: [
        new RecordingPeer('first', log),
        new RecordingPeer('second', log, failure),
      ],
    });

    await expect(app.stop()).rejects.toBe(failure);
    expect(log.stopped).toEqual(['second', 'first', 'servers']);
  });

  it('refuses to hand out the service before it starts', () => {
    const app = new ServiceTestApp({
      definition: ServiceDefinitionBuilder.aDefinition('not-started').build(),
      servers: new RecordingServers(new StopLog()),
      configurer: new NoHttpSetup(),
    });

    expect(() => app.service()).toThrow('not-started test app is not started');
  });
});
