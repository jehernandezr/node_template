import { randomBytes } from 'node:crypto';
import {
  IdentityErrorCode,
  IdentityEvent,
  RevocationReason,
} from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { AuthStateReader } from '@platform/auth';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  AccessTokenClaimsReader,
  IdentityJourney,
  IdentityTestApp,
  ShardedUsers,
  type SessionTokensBody,
} from '../../../__tests__/utils/index.js';
import { RevokeSessions } from '../application/revoke-sessions.use-case.js';
import { SessionToken } from '../domain/session-token.js';

const runtime = new ContainerRuntime(process.env);

/** La sesión de un usuario de prueba con la ruta que se lee de su access token. */
interface OpenSession {
  readonly journey: IdentityJourney;
  readonly tokens: SessionTokensBody;
  readonly ref: {
    readonly userId: string;
    readonly homeTenantId: string;
    readonly sessionId: string;
  };
}

runtime.describeIfAvailable(
  'session rotation with real PostgreSQL and Valkey',
  () => {
    jest.setTimeout(180_000);

    const app = new IdentityTestApp();

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    const openSession = async (email: string): Promise<OpenSession> => {
      const journey = new IdentityJourney(app, email);
      const tokens = await journey.signInWithEmailCode();
      const claims = AccessTokenClaimsReader.read(tokens.accessToken);
      return {
        journey,
        tokens,
        ref: {
          userId: String(claims['sub']),
          homeTenantId: String(claims['htid']),
          sessionId: String(claims['sid']),
        },
      };
    };

    /** Usuarios nuevos en cada caso: con un dispositivo ya registrado, el código por email no se ofrece. */
    const openSessionInEachShard = async (
      prefix: string,
    ): Promise<ReadonlyArray<[string, OpenSession]>> =>
      Promise.all(
        [...(await new ShardedUsers(app).oneInEachShard(prefix))].map(
          async ([shard, user]) =>
            [shard, await openSession(user.email)] as [string, OpenSession],
        ),
      );

    const refresh = (session: OpenSession, sessionToken: string) =>
      session.journey.native().post('/v1/auth/refresh', {
        body: { sessionToken },
      });

    /** Rota dos veces: el session token original queda dos generaciones atrás, fuera de la gracia. */
    const rotateTwice = async (session: OpenSession): Promise<string> => {
      const second = await refresh(session, session.tokens.sessionToken);
      const third = await refresh(
        session,
        (second.body as SessionTokensBody).sessionToken,
      );
      IdentityJourney.expectStatus(third, 200);
      return (third.body as SessionTokensBody).sessionToken;
    };

    it('rotates once when two tabs refresh at the same time, in the shard of each user', async () => {
      const sessions = await openSessionInEachShard('dos-pestanas');

      const results = await Promise.all(
        sessions.map(async ([shard, session]) => {
          const pair = await Promise.all([
            refresh(session, session.tokens.sessionToken),
            refresh(session, session.tokens.sessionToken),
          ]);
          const rotated = pair
            .map(
              (response) => (response.body as SessionTokensBody).sessionToken,
            )
            .filter(
              (token) =>
                token !== undefined && token !== session.tokens.sessionToken,
            );
          return {
            shard,
            statuses: pair.map((response) => response.status),
            distinctTokens: new Set(rotated).size,
            rows: await app
              .shards()
              .shardsWith(
                `SELECT 1 FROM sessions WHERE id = '${session.ref.sessionId}' AND generation = 2`,
              ),
          };
        }),
      );

      expect(results).toEqual(
        sessions.map(([shard]) => ({
          shard,
          statuses: [200, 200],
          distinctTokens: 1,
          rows: [shard],
        })),
      );
    });

    it('answers a forged token of an old generation as unknown and keeps the session alive', async () => {
      const sessions = await openSessionInEachShard('token-forjado');

      const outcomes = await Promise.all(
        sessions.map(async ([, session]) => {
          const current = await rotateTwice(session);
          const forged = new SessionToken(
            session.ref.userId,
            session.ref.homeTenantId,
            session.ref.sessionId,
            1,
            randomBytes(32),
          ).format();
          const attack = await refresh(session, forged);
          const after = await refresh(session, current);
          return {
            attack: { status: attack.status, body: attack.body },
            after: after.status,
            revoked: await app
              .get(AuthStateReader)
              .isSessionRevoked(session.ref.sessionId),
          };
        }),
      );

      expect(outcomes).toEqual(
        sessions.map(() => ({
          attack: {
            status: 401,
            body: expect.objectContaining({
              code: PlatformErrorCode.AuthUnauthenticated,
            }),
          },
          after: 200,
          revoked: false,
        })),
      );
    });

    it('revokes the session when the genuine token of an old generation comes back', async () => {
      const sessions = await openSessionInEachShard('token-viejo');

      const outcomes = await Promise.all(
        sessions.map(async ([, session]) => {
          const current = await rotateTwice(session);
          const reuse = await refresh(session, session.tokens.sessionToken);
          const after = await refresh(session, current);
          return {
            reuse: reuse.body,
            after: after.body,
            revoked: await app
              .get(AuthStateReader)
              .isSessionRevoked(session.ref.sessionId),
          };
        }),
      );

      expect(outcomes).toEqual(
        sessions.map(() => ({
          reuse: expect.objectContaining({
            code: IdentityErrorCode.SessionReused,
          }),
          after: expect.objectContaining({
            code: IdentityErrorCode.SessionRevoked,
          }),
          revoked: true,
        })),
      );
    });

    it('revokes in Valkey and leaves the events in the outbox of the shard of the user', async () => {
      const sessions = await openSessionInEachShard('cierre');

      const outcomes = await Promise.all(
        sessions.map(async ([shard, session]) => {
          const signOut = await session.journey
            .native()
            .post('/v1/auth/sign-out', {
              body: { sessionToken: session.tokens.sessionToken },
            });
          const probe = app.shards();
          return {
            shard,
            status: signOut.status,
            revoked: await app
              .get(AuthStateReader)
              .isSessionRevoked(session.ref.sessionId),
            revokedEvent: await probe.shardsWith(
              `SELECT 1 FROM outbox WHERE envelope->>'type' = '${IdentityEvent.SessionRevoked}' AND envelope->'data'->>'sessionId' = '${session.ref.sessionId}'`,
            ),
            tokensEvent: await probe.shardsWith(
              `SELECT 1 FROM outbox WHERE envelope->>'type' = '${IdentityEvent.TokensRevoked}' AND envelope->'data'->>'subjectId' = '${session.ref.sessionId}'`,
            ),
          };
        }),
      );

      expect(outcomes).toEqual(
        sessions.map(([shard]) => ({
          shard,
          status: 204,
          revoked: true,
          revokedEvent: [shard],
          tokensEvent: [shard],
        })),
      );
    });

    it('publishes the revocation of every session of a user with the tenant of origin, so the consumers that require a placed tenant accept it', async () => {
      const outcomes = await Promise.all(
        (await openSessionInEachShard('todas')).map(
          async ([shard, session]) => {
            await app.get(RevokeSessions).execute({
              user: {
                userId: session.ref.userId,
                homeTenantId: session.ref.homeTenantId,
              },
              reason: RevocationReason.UserAction,
            });
            return {
              shard,
              envelopeTenants: await app
                .shards()
                .rowsIn<{ tenant: string }>(
                  shard,
                  `SELECT envelope->>'tenantid' AS tenant FROM outbox WHERE envelope->>'type' = '${IdentityEvent.TokensRevoked}' AND envelope->'data'->>'subjectId' = '${session.ref.userId}'`,
                ),
              homeTenantId: session.ref.homeTenantId,
            };
          },
        ),
      );

      for (const outcome of outcomes) {
        expect(outcome.envelopeTenants).toEqual([
          { tenant: outcome.homeTenantId },
        ]);
      }
    });
  },
);
