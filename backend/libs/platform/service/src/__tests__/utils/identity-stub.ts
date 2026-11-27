import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  GetUserAccessOperation,
  GetUserProfileOperation,
  IdentityErrorCode,
  ListMembersByPermissionOperation,
  ListPushTargetsOperation,
  TokenAudience,
  UserStatus,
  type FeatureFlag,
  type Permission,
  type PlanFeature,
  type PushTarget,
} from '@contracts/identity';
import type { UserRef } from '@contracts/platform';
import {
  ValkeyAuthStateWriter,
  ValkeyCommandExecutor,
  ValkeyErrorTranslator,
  ValkeyCircuit,
} from '@platform/adapters-valkey';
import type { ValkeyTestServer } from '@platform/adapters-valkey/test-utils';
import type { AccessGrant } from '@platform/auth';
import { AccessTokenBuilder, TestKeyPair } from '@platform/auth/test-utils';
import { InternalApiRoute } from '@platform/internal-api';
import { SystemClock } from '@platform/kernel';
import { CallOutcome } from '@platform/primitives';

/** A tenant member as identity would see it: their access, their profile and their token session. */
export interface StubMember {
  readonly userId: string;
  readonly tenantId: string;
  readonly homeTenantId?: string;
  readonly sessionId?: string;
  readonly email?: string;
  readonly locale?: string;
  readonly permissions?: readonly Permission[];
  readonly features?: readonly PlanFeature[];
  readonly flags?: readonly FeatureFlag[];
  readonly pushTargets?: readonly PushTarget[];
}

/**
 * Fake identity for the services that depend on it: publishes the JWKS, signs tokens with that key,
 * writes the shared state to Valkey with the admin connection (only identity can write
 * `auth:*`) and answers over HTTP the internal read operations that the services request. It does not verify
 * the signature of the calls: what is under test is the calling service.
 */
export class IdentityStub {
  static readonly ISSUER = 'https://identity.test';
  private static readonly DEFAULT_SESSION =
    '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04';

  private readonly keyPair = TestKeyPair.generate('identity-stub');
  private readonly clock = new SystemClock();
  private readonly members = new Map<string, StubMember>();
  private readonly server: Server = createServer((request, response) => {
    this.answer(request, response).catch((error: unknown) => {
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end(String(error));
    });
  });
  private writer: ValkeyAuthStateWriter | undefined;

  async start(valkey: ValkeyTestServer): Promise<void> {
    this.writer = new ValkeyAuthStateWriter(
      new ValkeyCommandExecutor(
        valkey.superuser,
        new ValkeyErrorTranslator(),
        new ValkeyCircuit(this.clock),
      ),
      this.clock,
    );
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  /** Variables for token verification and for the internal API to identity. */
  environment(): Record<string, string> {
    const base = this.baseUrl();
    return {
      AUTH_ISSUER: IdentityStub.ISSUER,
      AUTH_JWKS_URL: `${base}/v1/auth/jwks`,
      INTERNAL_API_BASE_URLS: JSON.stringify({ identity: base }),
    };
  }

  /** Registers the member, publishes their access and returns an access token for them. */
  async tokenFor(member: StubMember): Promise<string> {
    this.members.set(member.userId, member);
    const writer = this.started();
    await writer.setPermissionVersion(member.tenantId, undefined, 1);
    await writer.setPermissionVersion(member.tenantId, member.userId, 1);
    await writer.putAccessGrant(
      member.tenantId,
      member.userId,
      this.grantOf(member),
    );
    return AccessTokenBuilder.aToken(
      Math.floor(this.clock.now().getTime() / 1000),
    )
      .withClaims({
        iss: IdentityStub.ISSUER,
        aud: TokenAudience.Api,
        sub: member.userId,
        tid: member.tenantId,
        htid: IdentityStub.homeOf(member),
        sid: member.sessionId ?? IdentityStub.DEFAULT_SESSION,
      })
      .sign(this.keyPair);
  }

  private async answer(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (request.method === 'GET') {
      IdentityStub.json(response, { keys: [this.keyPair.jwk()] });
      return;
    }
    const body = JSON.parse(await IdentityStub.read(request)) as {
      input: Record<string, unknown>;
    };
    IdentityStub.json(response, {
      outcome: this.outcomeOf(request.url ?? '', body.input),
    });
  }

  private outcomeOf(path: string, input: Record<string, unknown>): unknown {
    const member = this.members.get(
      String(input['userId'] ?? (input['user'] as UserRef | undefined)?.userId),
    );
    switch (path) {
      case InternalApiRoute.pathOf(GetUserProfileOperation.id):
        return member === undefined
          ? CallOutcome.businessError(IdentityErrorCode.UserNotFound)
          : CallOutcome.success(this.profileOf(member));
      case InternalApiRoute.pathOf(GetUserAccessOperation.id):
        return member === undefined
          ? CallOutcome.businessError(IdentityErrorCode.UserNotFound)
          : CallOutcome.success({ ...this.grantOf(member), roles: [] });
      case InternalApiRoute.pathOf(ListPushTargetsOperation.id):
        return CallOutcome.success({
          targets: [...(member?.pushTargets ?? [])],
        });
      case InternalApiRoute.pathOf(ListMembersByPermissionOperation.id):
        return CallOutcome.success({
          items: [...this.members.values()]
            .filter(
              (m) =>
                m.tenantId === input['tenantId'] &&
                (m.permissions ?? []).includes(
                  input['permission'] as Permission,
                ),
            )
            .map((m) => ({
              userId: m.userId,
              homeTenantId: IdentityStub.homeOf(m),
            })),
          nextCursor: null,
        });
      default:
        throw new Error(`IdentityStub does not answer ${path}`);
    }
  }

  private profileOf(member: StubMember) {
    return {
      id: member.userId,
      email: member.email ?? `${member.userId.slice(-6)}@example.com`,
      emailVerifiedAt: null,
      displayName: 'Ana Test',
      locale: member.locale ?? 'es',
      status: UserStatus.Active,
      homeTenantId: IdentityStub.homeOf(member),
      lastTenantId: member.tenantId,
    };
  }

  private grantOf(member: StubMember): AccessGrant {
    return {
      permissions: member.permissions ?? [],
      platformRoles: [],
      features: member.features ?? [],
      flags: member.flags ?? [],
      permissionVersion: '1.1',
    };
  }

  private baseUrl(): string {
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  private started(): ValkeyAuthStateWriter {
    if (this.writer === undefined) {
      throw new Error('IdentityStub is not started');
    }
    return this.writer;
  }

  private static homeOf(member: StubMember): string {
    return member.homeTenantId ?? member.tenantId;
  }

  private static json(response: ServerResponse, body: unknown): void {
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify(body));
  }

  private static async read(request: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}
