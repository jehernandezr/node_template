/**
 * Las funciones de Jest que registran suites y pruebas. Se inyectan para que
 * `ContainerRuntime` se pueda probar sin reemplazar los globales de Jest.
 */
export abstract class SuiteApi {
  abstract describe(name: string, body: () => void): void;

  abstract skip(name: string, body: () => void): void;

  abstract it(name: string, test: () => void): void;
}
