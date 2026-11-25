import { NestFactory } from '@nestjs/core';
import type { ErrorCatalogEntry, ServiceContract } from '@contracts/platform';
import {
  TestKeyPair,
  InMemoryAuthState,
  FakeAccessGrantSource,
} from '@platform/auth/test-utils';
import type { INestApplication, Type } from '@nestjs/common';
import { HttpApplicationSetup } from '../../http-application-setup.js';
import { HttpTestClient } from '../../../__tests__/utils/index.js';
import { HttpTestRootModule } from './http-test-root.module.js';
import { StartedHttpTestApp } from './started-http-test-app.js';
import { demoErrorCatalog } from './demo-contract.js';

/** Starts a real Nest app with the HTTP entry, listening on a free port. */
export class HttpTestApp {
  static async start(options: {
    readonly controllers: Type<unknown>[];
    readonly contract: ServiceContract;
    readonly catalogs?: readonly (readonly ErrorCatalogEntry[])[];
    readonly env?: Record<string, string>;
    readonly validateOutput?: boolean;
  }): Promise<StartedHttpTestApp> {
    const keys = TestKeyPair.generate('test-key');
    const module = HttpTestRootModule.forRoot({
      keys,
      controllers: options.controllers,
      contract: options.contract,
      catalogs: [demoErrorCatalog, ...(options.catalogs ?? [])],
      env: options.env ?? {},
      validateOutput: options.validateOutput,
    });
    const app: INestApplication = await NestFactory.create(module, {
      abortOnError: false,
      logger: false,
    });
    try {
      new HttpApplicationSetup().configure(app);
      await app.listen(0, '127.0.0.1');
      const address = app.getHttpServer().address();
      const port =
        typeof address === 'object' && address !== null ? address.port : 0;
      return new StartedHttpTestApp(
        new HttpTestClient(`http://127.0.0.1:${port}`),
        app.get(InMemoryAuthState),
        app.get(FakeAccessGrantSource),
        keys,
        app,
      );
    } catch (error) {
      await app.close();
      throw error;
    }
  }
}
