import { ContainerProbe } from './container-probe.js';
import { DockerCliProbe } from './docker-cli-probe.js';
import { IntegrationMode } from './integration-mode.js';
import { JestSuiteApi } from './jest-suite-api.js';
import type { SuiteApi } from './suite-api.js';

/**
 * Decide si corren las pruebas que necesitan contenedores. Una sola variable,
 * `INTEGRATION_TESTS=skip|require`, y una sola detección de Docker para todas
 * las librerías.
 */
export class ContainerRuntime {
  private available: boolean | undefined;

  constructor(
    private readonly env: Readonly<Record<string, string | undefined>>,
    private readonly probe: ContainerProbe = new DockerCliProbe(),
    private readonly suites: SuiteApi = new JestSuiteApi(),
  ) {}

  /**
   * Valor de `INTEGRATION_TESTS`. Sin valor, `Require` si `CI` es `true` y
   * `Skip` si no. Un valor desconocido lanza un `Error` que lista los válidos.
   */
  get mode(): IntegrationMode {
    const raw = this.env['INTEGRATION_TESTS'];
    if (raw === undefined || raw === '') {
      return this.env['CI'] === 'true'
        ? IntegrationMode.Require
        : IntegrationMode.Skip;
    }
    if (raw === IntegrationMode.Skip) {
      return IntegrationMode.Skip;
    }
    if (raw === IntegrationMode.Require) {
      return IntegrationMode.Require;
    }
    throw new Error(
      `INTEGRATION_TESTS must be one of: ${Object.values(IntegrationMode).join(', ')}`,
    );
  }

  /** Indica si hay un runtime de contenedores. Consulta la sonda una sola vez. */
  isAvailable(): boolean {
    this.available ??= this.probe.isRunning();
    return this.available;
  }

  /**
   * `describe` de una suite con contenedores. Con runtime corre normal; sin
   * runtime en modo `Skip` queda como `describe.skip`; en modo `Require` define
   * una prueba que falla con un mensaje claro. Lee el modo antes de consultar
   * la sonda, así un `INTEGRATION_TESTS` inválido falla aunque haya runtime.
   */
  describeIfAvailable(name: string, body: () => void): void {
    const mode = this.mode;
    if (this.isAvailable()) {
      this.suites.describe(name, body);
      return;
    }
    if (mode === IntegrationMode.Skip) {
      this.suites.skip(name, body);
      return;
    }
    this.suites.describe(name, () => {
      this.suites.it('needs a container runtime', () => {
        throw new Error(
          'INTEGRATION_TESTS=require but no container runtime is available',
        );
      });
    });
  }
}
