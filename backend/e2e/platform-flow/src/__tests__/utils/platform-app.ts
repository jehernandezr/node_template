import {
  billingService,
  CloseInvoicePeriodsJob,
  SeedPlans,
} from '@apps/billing/test-utils';
import {
  Eventually,
  identityService,
  SeedRegionTenants,
  type IdentityEntry,
} from '@apps/identity/test-utils';
import { notificationsService } from '@apps/notifications/test-utils';
import { reportsService } from '@apps/reports/test-utils';
import { tasksService } from '@apps/tasks/test-utils';
import { HttpApplicationSetup } from '@platform/http/nest';
import { JobContexts } from '@platform/kernel/test-utils';
import { MessageDispatcher } from '@platform/messaging';
import { InMemoryBus } from '@platform/messaging/test-utils';
import { SchedulingMode } from '@platform/scheduling';
import { MigrationTarget, type ServiceDefinition } from '@platform/service';
import { ServiceBootstrap, ServiceMigrator } from '@platform/service/nest';
import type { ProvisionedService } from '@platform/service/test-utils';
import { BusEnvelopePublisher } from './bus-envelope-publisher.js';
import { FreePorts } from './free-ports.js';
import { IdentityHttpEntry } from './identity-http-entry.js';
import { PlatformBus } from './platform-bus.js';
import { PlatformEnvironment } from './platform-environment.js';
import { PlatformNode } from './platform-node.js';
import { PlatformServers } from './platform-servers.js';
import { PlatformService } from './platform-service.enum.js';

/**
 * The five services in one process, over a real PostgreSQL and Valkey, joined by an in-memory bus instead of
 * SNS and SQS and by signed HTTP on the internal API. Jobs do not run on their own: the test publishes the outboxes with
 * `settle` and runs by hand the ones it needs, so each step finishes before checking the result.
 */
export class PlatformApp {
  /** Timeout for a message flow between services to finish. */
  private static readonly SETTLE_TIMEOUT_MS = 30_000;
  private static readonly DEFINITIONS: Readonly<
    Record<PlatformService, ServiceDefinition>
  > = {
    [PlatformService.Identity]: identityService,
    [PlatformService.Tasks]: tasksService,
    [PlatformService.Notifications]: notificationsService,
    [PlatformService.Reports]: reportsService,
    [PlatformService.Billing]: billingService,
  };

  private readonly servers = new PlatformServers();
  private readonly platformBus = new PlatformBus(
    Object.values(PlatformApp.DEFINITIONS).map(
      (definition) => definition.contract,
    ),
  );
  private readonly nodes = new Map<PlatformService, PlatformNode>();
  private serversStarted = false;

  async start(): Promise<void> {
    await this.servers.start();
    this.serversStarted = true;
    const databases = await this.provisionAll();
    const environment = new PlatformEnvironment(
      this.servers,
      databases,
      await PlatformApp.reservePorts(),
    );
    for (const service of Object.values(PlatformService)) {
      await this.migrate(service, databases[service], environment);
      await this.boot(service, databases[service], environment);
    }
    await this.node(PlatformService.Identity).get(SeedRegionTenants).execute();
    await this.node(PlatformService.Billing).get(SeedPlans).execute();
  }

  /** Closes everything it managed to open, even if something fails, and then reports the errors. */
  async stop(): Promise<void> {
    const failures: unknown[] = [];
    const attempt = async (close: () => Promise<void>): Promise<void> => {
      try {
        await close();
      } catch (error) {
        failures.push(error);
      }
    };
    for (const node of [...this.nodes.values()].reverse()) {
      await attempt(() => node.stop());
    }
    this.nodes.clear();
    if (this.serversStarted) {
      await attempt(() => this.servers.stop());
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'The platform shutdown failed');
    }
  }

  node(service: PlatformService): PlatformNode {
    const node = this.nodes.get(service);
    if (node === undefined) {
      throw new Error(`${service} is not running`);
    }
    return node;
  }

  /** What a test user needs to go through identity over HTTP. */
  identity(): IdentityEntry {
    return new IdentityHttpEntry(this.node(PlatformService.Identity));
  }

  /**
   * Publishes the outboxes of the five services and delivers what was published until nothing is in flight, including the
   * messages a delivery produces and the retries.
   * @throws Error if a message ends up in the error queue or the flow does not stop in time.
   */
  async settle(): Promise<void> {
    await Eventually.until(async () => {
      let moved = 0;
      for (const node of this.nodes.values()) {
        moved += await node.relayOutbox();
      }
      moved += await this.platformBus.deliverDue();
      return moved === 0 && this.platformBus.isIdle();
    }, PlatformApp.SETTLE_TIMEOUT_MS);
    const lost = this.platformBus.deadLetters();
    if (lost.length > 0) {
      throw new Error(
        `Messages in the dead-letter queue: ${lost.map((entry) => `${entry.envelope.type} del tenant ${String(entry.envelope.tenantid)} (${entry.error})`).join(', ')}`,
      );
    }
  }

  /** Closes the expired billing periods, as its hourly job does. */
  async closeInvoicePeriods(): Promise<void> {
    await this.node(PlatformService.Billing)
      .get(CloseInvoicePeriodsJob)
      .run(JobContexts.live());
  }

  private static async reservePorts(): Promise<
    Record<PlatformService, number>
  > {
    const services = Object.values(PlatformService);
    const ports = await FreePorts.reserve(services.length);
    return Object.fromEntries(
      services.map((service, index) => [service, ports[index] ?? 0]),
    ) as Record<PlatformService, number>;
  }

  private async provisionAll(): Promise<
    Record<PlatformService, ProvisionedService>
  > {
    const databases: Partial<Record<PlatformService, ProvisionedService>> = {};
    for (const service of Object.values(PlatformService)) {
      databases[service] = await this.servers.provision(service);
    }
    return databases as Record<PlatformService, ProvisionedService>;
  }

  private async migrate(
    service: PlatformService,
    databases: ProvisionedService,
    environment: PlatformEnvironment,
  ): Promise<void> {
    const migrator = new ServiceMigrator();
    const options = { env: environment.of(service) };
    const definition = PlatformApp.DEFINITIONS[service];
    await migrator.run(definition, MigrationTarget.Catalog, options);
    await databases.registerShards();
    await migrator.run(definition, MigrationTarget.Shards, options);
  }

  private async boot(
    service: PlatformService,
    databases: ProvisionedService,
    environment: PlatformEnvironment,
  ): Promise<void> {
    const running = await ServiceBootstrap.http(
      PlatformApp.DEFINITIONS[service],
      {
        env: environment.of(service),
        publisher: BusEnvelopePublisher,
        schedulingMode: SchedulingMode.External,
        overrides: [{ provide: InMemoryBus, useValue: this.platformBus.bus }],
        http: {
          port: environment.portOf(service),
          host: '127.0.0.1',
          configurer: new HttpApplicationSetup(),
        },
      },
    );
    const node = new PlatformNode(service, databases, running);
    this.nodes.set(service, node);
    this.platformBus.attach(service, node.get(MessageDispatcher));
  }
}
