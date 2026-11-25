import { Global, Module, type DynamicModule } from '@nestjs/common';
import {
  FakeAccessGrantSource,
  FakeApiKeyResolver,
  InMemoryAuthState,
  TestKeyPair,
} from '@platform/auth/test-utils';
import { StaticJwksKeySource } from '@platform/auth';

/** Global auth state doubles, with the test signing keys. */
@Global()
@Module({})
export class AuthDoublesModule {
  static forKeys(keys: TestKeyPair): DynamicModule {
    return {
      module: AuthDoublesModule,
      global: true,
      providers: [
        InMemoryAuthState,
        FakeAccessGrantSource,
        FakeApiKeyResolver,
        { provide: StaticJwksKeySource, useValue: keys.keySource() },
      ],
      exports: [
        InMemoryAuthState,
        FakeAccessGrantSource,
        FakeApiKeyResolver,
        StaticJwksKeySource,
      ],
    };
  }
}
