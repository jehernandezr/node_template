import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
  RevocationReason,
} from '@contracts/identity';
import type { AccessGrant } from '../../access/access-grant.js';
import { ApiKeyEnvironment } from '../../api-keys/api-key-environment.enum.js';
import type { ApiKeyPrincipal } from '../../api-keys/api-key-principal.js';
import type { AuthRevocationFeed } from '../../state/auth-revocation-feed.js';
import type { AuthStateReader } from '../../state/auth-state-reader.js';
import type { AuthStateWriter } from '../../state/auth-state-writer.js';

/** Lector, escritor y aviso de revocaciones que comparten el mismo estado. */
export interface AuthStateHarness {
  readonly reader: AuthStateReader;
  readonly writer: AuthStateWriter;
  readonly feed: AuthRevocationFeed;
}

/** Entrega de una revocación: la promesa del `sid` recibido y la baja de la suscripción. */
interface RevocationProbe {
  readonly received: Promise<string>;
  readonly unsubscribe: () => Promise<void>;
}

const EPOCH = { revokedBefore: 1_700_000_000, suspended: true };
const GRANT: AccessGrant = {
  permissions: [Permission.TasksRead, Permission.BillingWrite],
  platformRoles: [PlatformRole.Support],
  features: [PlanFeature.Webhooks],
  flags: [FeatureFlag.NewReports],
  permissionVersion: '3.7',
};
const HASH = 'a'.repeat(64);
const OTHER_HASH = 'b'.repeat(64);
const PRINCIPAL: ApiKeyPrincipal = {
  apiKeyId: 'key-1',
  serviceAccountId: 'service-1',
  tenantId: 'tenant-1',
  environment: ApiKeyEnvironment.Live,
  permissions: [Permission.TasksRead],
};

/** Ayudas de las pruebas de contrato: juntar lotes y esperar una revocación. */
class AuthStateProbe {
  static async collect(
    iterable: AsyncIterable<readonly string[]>,
  ): Promise<string[]> {
    const sessions: string[] = [];
    for await (const batch of iterable) {
      sessions.push(...batch);
    }
    return sessions;
  }

  /** Se suscribe y espera la primera revocación; rechaza si no llega a tiempo. */
  static async nextRevocation(
    feed: AuthRevocationFeed,
    timeoutMs = 2000,
  ): Promise<RevocationProbe> {
    let deliver: (sessionId: string) => void = () => undefined;
    const received = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('no revocation received')),
        timeoutMs,
      );
      deliver = (sessionId) => {
        clearTimeout(timer);
        resolve(sessionId);
      };
    });
    const unsubscribe = await feed.subscribe((sessionId) => deliver(sessionId));
    return { received, unsubscribe };
  }
}

/**
 * Prueba de contrato de `AuthStateReader`, `AuthStateWriter` y `AuthRevocationFeed`.
 * La corren el doble en memoria y el adaptador de Valkey, para que no diverjan.
 * Registra sus `describe` e `it` y debe llamarse en el cuerpo de un archivo de prueba.
 */
export function runAuthStateContract(
  name: string,
  create: () => AuthStateHarness | Promise<AuthStateHarness>,
): void {
  describe(`${name} as auth state`, () => {
    describe('session revocation', () => {
      it('reports a revoked session and no other', async () => {
        const { reader, writer } = await create();

        await writer.revokeSession('s1', 60_000, RevocationReason.Logout);

        expect(await reader.isSessionRevoked('s1')).toBe(true);
        expect(await reader.isSessionRevoked('s2')).toBe(false);
      });

      it('lists the revoked session among the revoked sessions', async () => {
        const { reader, writer } = await create();
        await writer.revokeSession('s1', 60_000, RevocationReason.Logout);

        const sessions = await AuthStateProbe.collect(
          reader.revokedSessionIds(),
        );

        expect(sessions).toContain('s1');
      });

      it('delivers the revocation to a handler subscribed before it', async () => {
        const { writer, feed } = await create();
        const probe = await AuthStateProbe.nextRevocation(feed);

        await writer.revokeSession('s1', 60_000, RevocationReason.Logout);

        await expect(probe.received).resolves.toBe('s1');
        await probe.unsubscribe();
      });

      it('delivers the revocation to every subscribed handler', async () => {
        const { writer, feed } = await create();
        const first = await AuthStateProbe.nextRevocation(feed);
        const second = await AuthStateProbe.nextRevocation(feed);

        await writer.revokeSession('s1', 60_000, RevocationReason.Logout);

        await expect(first.received).resolves.toBe('s1');
        await expect(second.received).resolves.toBe('s1');
        await first.unsubscribe();
        await second.unsubscribe();
      });

      it('stops delivering to a handler once it unsubscribes', async () => {
        const { writer, feed } = await create();
        const seenByFirst: string[] = [];
        const unsubscribeFirst = await feed.subscribe((sessionId) => {
          seenByFirst.push(sessionId);
        });
        const second = await AuthStateProbe.nextRevocation(feed);
        await unsubscribeFirst();

        await writer.revokeSession('s1', 60_000, RevocationReason.Logout);

        await expect(second.received).resolves.toBe('s1');
        expect(seenByFirst).toEqual([]);
        await second.unsubscribe();
      });
    });

    describe('user and tenant epochs', () => {
      it('reads no user epoch before one is written', async () => {
        const { reader } = await create();

        expect(await reader.userEpoch('u1')).toBeUndefined();
      });

      it('reads back the user epoch written', async () => {
        const { reader, writer } = await create();

        await writer.setUserEpoch('u1', EPOCH);

        expect(await reader.userEpoch('u1')).toEqual(EPOCH);
      });

      it('reads no tenant epoch before one is written', async () => {
        const { reader } = await create();

        expect(await reader.tenantEpoch('t1')).toBeUndefined();
      });

      it('reads back the tenant epoch written', async () => {
        const { reader, writer } = await create();

        await writer.setTenantEpoch('t1', EPOCH);

        expect(await reader.tenantEpoch('t1')).toEqual(EPOCH);
      });
    });

    describe('permission versions', () => {
      it('reads no version when only the tenant version is set', async () => {
        const { reader, writer } = await create();

        await writer.setPermissionVersion('t1', undefined, 3);

        expect(await reader.permissionVersion('t1', 'u1')).toBeUndefined();
      });

      it('reads no version when only the user version is set', async () => {
        const { reader, writer } = await create();

        await writer.setPermissionVersion('t1', 'u1', 7);

        expect(await reader.permissionVersion('t1', 'u1')).toBeUndefined();
      });

      it('reads both versions once both are set', async () => {
        const { reader, writer } = await create();

        await writer.setPermissionVersion('t1', undefined, 3);
        await writer.setPermissionVersion('t1', 'u1', 7);

        expect(await reader.permissionVersion('t1', 'u1')).toEqual({
          tenant: 3,
          user: 7,
        });
      });
    });

    describe('access grants', () => {
      it('reads no grant before one is written', async () => {
        const { reader } = await create();

        expect(await reader.accessGrant('t1', 'u1')).toBeUndefined();
      });

      it('reads back the grant written with its permission version', async () => {
        const { reader, writer } = await create();

        await writer.putAccessGrant('t1', 'u1', GRANT);

        expect(await reader.accessGrant('t1', 'u1')).toEqual(GRANT);
      });
    });

    describe('API keys', () => {
      it('reads no principal before one is stored', async () => {
        const { reader } = await create();

        expect(await reader.apiKey('abcd1234', HASH)).toBeUndefined();
      });

      it('reads the principal under its secret hash', async () => {
        const { reader, writer } = await create();

        await writer.putApiKey('abcd1234', HASH, PRINCIPAL);

        expect(await reader.apiKey('abcd1234', HASH)).toEqual(PRINCIPAL);
      });

      it('reads no principal for another secret hash', async () => {
        const { reader, writer } = await create();
        await writer.putApiKey('abcd1234', HASH, PRINCIPAL);

        expect(await reader.apiKey('abcd1234', OTHER_HASH)).toBeUndefined();
      });

      it('reads no principal after the key is dropped', async () => {
        const { reader, writer } = await create();
        await writer.putApiKey('abcd1234', HASH, PRINCIPAL);

        await writer.dropApiKey('abcd1234');

        expect(await reader.apiKey('abcd1234', HASH)).toBeUndefined();
      });
    });
  });
}
