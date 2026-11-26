import { SuiteApi } from './suite-api.js';

/** Registers suites and tests with the Jest globals of the file that uses it. */
export class JestSuiteApi extends SuiteApi {
  override describe(name: string, body: () => void): void {
    describe(name, body);
  }

  override skip(name: string, body: () => void): void {
    describe.skip(name, body);
  }

  override it(name: string, test: () => void): void {
    it(name, test);
  }
}
