import { SuiteApi } from './suite-api.js';

/** Registra suites y pruebas con los globales de Jest del archivo que la usa. */
export class JestSuiteApi extends SuiteApi {
  describe(name: string, body: () => void): void {
    describe(name, body);
  }

  skip(name: string, body: () => void): void {
    describe.skip(name, body);
  }

  it(name: string, test: () => void): void {
    it(name, test);
  }
}
