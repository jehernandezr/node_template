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
 * Los cinco servicios en un proceso, sobre un PostgreSQL y un Valkey reales, unidos por un bus en memoria en lugar de
 * SNS y SQS y por HTTP firmado en la API interna. Los jobs no corren solos: la prueba publica los outbox con
 * `settle` y corre a mano los que necesita, así cada paso termina antes de mirar el resultado.
 */
export class PlatformApp {
  /** Plazo para que un flujo de mensajes entre servicios termine. */
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

  /** Cierra todo lo que alcanzó a abrir, aunque algo falle, y después informa los errores. */
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
      throw new AggregateError(failures, 'El cierre de la plataforma falló');
    }
  }

  node(service: PlatformService): PlatformNode {
    const node = this.nodes.get(service);
    if (node === undefined) {
      throw new Error(`${service} no está en marcha`);
    }
    return node;
  }

  /** Lo que necesita un usuario de prueba para recorrer identity por HTTP. */
  identity(): IdentityEntry {
    return new IdentityHttpEntry(this.node(PlatformService.Identity));
  }

  /**
   * Publica los outbox de los cinco servicios y entrega lo publicado hasta que nada queda en camino, incluidos los
   * mensajes que una entrega produce y los reintentos.
   * @throws Error si un mensaje termina en la cola de errores o el flujo no se detiene a tiempo.
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
        `Mensajes en la cola de errores: ${lost.map((entry) => `${entry.envelope.type} del tenant ${String(entry.envelope.tenantid)} (${entry.error})`).join(', ')}`,
      );
    }
  }

  /** Cierra los periodos vencidos de billing, como lo hace su job diario. */
  async closeInvoicePeriods(): Promise<void> {
    await this.node(PlatformService.Billing).get(CloseInvoicePeriodsJob).run();
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
