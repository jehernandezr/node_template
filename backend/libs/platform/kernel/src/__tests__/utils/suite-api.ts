/**
 * The Jest functions that register suites and tests. They are injected so
 * `ContainerRuntime` can be tested without replacing the Jest globals.
 */
export abstract class SuiteApi {
  abstract describe(name: string, body: () => void): void;

  abstract skip(name: string, body: () => void): void;

  abstract it(name: string, test: () => void): void;
}
