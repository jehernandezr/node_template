import { randomBytes } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  AccessTokenBuilder,
  FakeAccessGrantSource,
  InMemoryAuthState,
  TestKeyPair,
} from '@platform/auth/test-utils';
import {
  ApiKeyEnvironment,
  ApiKeyFormat,
  type ApiKeyPrincipal,
} from '@platform/auth';
import type { AccessTokenClaims, Permission } from '@contracts/identity';
import { HttpTestClient } from '../../../__tests__/utils/index.js';

export const TEST_USER_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
export const TEST_TENANT_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a02';

/** Usuario nuevo por token: el caché de grants es por usuario y cada prueba fija sus permisos. */
function freshUserId(): string {
  return '0192f1b4-7c3a-7d2e-9a41-' + randomBytes(6).toString('hex');
}

/** App de prueba arrancada: cliente HTTP, dobles de auth y claves para firmar tokens. */
export class StartedHttpTestApp {
  constructor(
    readonly client: HttpTestClient,
    readonly authState: InMemoryAuthState,
    readonly grants: FakeAccessGrantSource,
    readonly keys: TestKeyPair,
    readonly app: INestApplication,
  ) {}

  /**
   * Access token firmado. Siembra la versión de permisos y el grant del usuario para que el
   * verificador lo acepte, y devuelve el token.
   */
  async tokenFor(
    options: {
      readonly claims?: Partial<AccessTokenClaims>;
      readonly permissions?: readonly Permission[];
    } = {},
  ): Promise<string> {
    const claims: Partial<AccessTokenClaims> = {
      sub: freshUserId(),
      tid: TEST_TENANT_ID,
      ...options.claims,
    };
    const tenantId = claims.tid ?? TEST_TENANT_ID;
    const userId = claims.sub ?? freshUserId();
    const iat = Math.floor(Date.now() / 1000);
    const token = AccessTokenBuilder.aToken(iat).withClaims({ iat, ...claims });
    await this.authState.setPermissionVersion(tenantId, undefined, 1);
    await this.authState.setPermissionVersion(tenantId, userId, 1);
    this.grants.set(tenantId, userId, {
      permissions: options.permissions ?? [],
      platformRoles: [],
      features: [],
      flags: [],
      permissionVersion: '1.1',
    });
    return token.sign(this.keys);
  }

  /** API key válida de prueba con secreto aleatorio, sembrada en el estado de auth. */
  async seedApiKey(): Promise<string> {
    const prefix = randomBytes(4).toString('hex');
    const secret = randomBytes(24).toString('hex');
    const principal: ApiKeyPrincipal = {
      apiKeyId: randomBytes(16).toString('hex'),
      serviceAccountId: randomBytes(16).toString('hex'),
      tenantId: TEST_TENANT_ID,
      environment: ApiKeyEnvironment.Test,
      permissions: [],
    };
    await this.authState.putApiKey(
      prefix,
      ApiKeyFormat.hashSecret(secret),
      principal,
    );
    return `sk_test_${prefix}_${secret}`;
  }

  async stop(): Promise<void> {
    await this.app.close();
  }
}
