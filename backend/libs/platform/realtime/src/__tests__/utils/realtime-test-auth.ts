import { AccessTokenVerifier, CachedAccessResolver } from '@platform/auth';
import {
  AccessTokenBuilder,
  FakeAccessGrantSource,
  InMemoryAuthState,
  TestKeyPair,
} from '@platform/auth/test-utils';
import { SystemClock } from '@platform/kernel';

/** Firma y verifica access tokens de prueba con el reloj real, como los ve un transporte en marcha. */
export class RealtimeTestAuth {
  static readonly USER_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
  static readonly TENANT_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';
  static readonly HOME_TENANT_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f03';
  static readonly SESSION_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04';

  private readonly keyPair = TestKeyPair.generate('realtime');
  /** Estado de autenticación compartido: la prueba revoca o suspende aquí. */
  readonly state = new InMemoryAuthState();
  private readonly clock = new SystemClock();
  readonly verifier = new AccessTokenVerifier(
    this.keyPair.keySource(),
    this.state,
    new CachedAccessResolver(
      this.state,
      new FakeAccessGrantSource(),
      this.clock,
      { ttlMs: 1000, maxEntries: 10 },
    ),
    this.clock,
    'https://identity.test',
  );

  static async create(): Promise<RealtimeTestAuth> {
    const auth = new RealtimeTestAuth();
    await auth.state.setPermissionVersion(
      RealtimeTestAuth.TENANT_ID,
      undefined,
      1,
    );
    await auth.state.setPermissionVersion(
      RealtimeTestAuth.TENANT_ID,
      RealtimeTestAuth.USER_ID,
      1,
    );
    return auth;
  }

  /** Token válido del usuario de prueba con la sesión dada. */
  token(sessionId = RealtimeTestAuth.SESSION_ID): string {
    return AccessTokenBuilder.aToken(
      Math.floor(this.clock.now().getTime() / 1000),
    )
      .withClaims({ sid: sessionId })
      .sign(this.keyPair);
  }

  /** Token firmado con otra clave: el verificador no lo reconoce. */
  forgedToken(): string {
    return AccessTokenBuilder.aToken(
      Math.floor(this.clock.now().getTime() / 1000),
    ).sign(TestKeyPair.generate('realtime'));
  }
}
