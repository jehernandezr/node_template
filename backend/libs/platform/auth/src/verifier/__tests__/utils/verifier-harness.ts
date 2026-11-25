import { TokenAudience } from '@contracts/identity';
import { FixedClock } from '@platform/kernel/test-utils';
import { AccessTokenBuilder } from '../../../__tests__/utils/access-token-builder.js';
import { InMemoryAuthState } from '../../../__tests__/utils/in-memory-auth-state.js';
import { TestKeyPair } from '../../../__tests__/utils/test-key-pair.js';
import type { UserActor } from '../../../actor/actor.js';
import type { JwksKeySource } from '../../../jwks/jwks-key-source.js';
import { AccessTokenVerifier } from '../../access-token-verifier.js';
import { FailingAuthStateReader } from './failing-auth-state-reader.js';
import { StubAccessResolver } from './stub-access-resolver.js';

/** Options of `VerifierHarness.create`. */
export interface VerifierHarnessOptions {
  /** If `false`, the state has no permission versions and the verifier uses the grant. */
  readonly withVersions?: boolean;
  /** Key source different from that of the test key pair. */
  readonly keys?: JwksKeySource;
}

/** Verifier built with a fixed clock, a key pair and in-memory state for tests. */
export class VerifierHarness {
  static readonly ISSUER = 'https://identity.test';
  static readonly USER_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
  static readonly TENANT_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';

  readonly clock = new FixedClock(new Date('2026-01-15T12:00:00.000Z'));
  readonly keyPair = TestKeyPair.generate('k1');
  readonly state = new InMemoryAuthState();
  readonly reader = new FailingAuthStateReader(this.state);
  readonly access = new StubAccessResolver();
  readonly verifier: AccessTokenVerifier;

  private constructor(keys: JwksKeySource | undefined) {
    this.verifier = new AccessTokenVerifier(
      keys ?? this.keyPair.keySource(),
      this.reader,
      this.access,
      this.clock,
      VerifierHarness.ISSUER,
    );
  }

  static async create(
    options: VerifierHarnessOptions = {},
  ): Promise<VerifierHarness> {
    const harness = new VerifierHarness(options.keys);
    harness.access.grant = {
      permissions: [],
      platformRoles: [],
      features: [],
      flags: [],
      permissionVersion: '1.1',
    };
    if (options.withVersions ?? true) {
      await harness.state.setPermissionVersion(
        VerifierHarness.TENANT_ID,
        undefined,
        1,
      );
      await harness.state.setPermissionVersion(
        VerifierHarness.TENANT_ID,
        VerifierHarness.USER_ID,
        1,
      );
    }
    return harness;
  }

  get nowSeconds(): number {
    return Math.floor(this.clock.now().getTime() / 1000);
  }

  /** Token signed with the harness key. */
  token(
    builder: AccessTokenBuilder = AccessTokenBuilder.aToken(this.nowSeconds),
  ): string {
    return builder.sign(this.keyPair);
  }

  verify(
    token: string,
    audience: TokenAudience = TokenAudience.Api,
  ): Promise<UserActor> {
    return this.verifier.verify(token, { audience });
  }
}
