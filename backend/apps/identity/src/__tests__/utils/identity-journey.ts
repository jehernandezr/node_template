import { createHash } from 'node:crypto';
import type {
  HttpTestClient,
  HttpTestResponse,
} from '@platform/http/test-utils';
import { IdentityEmailTemplate } from '../../shared/enums/identity-email-template.enum.js';
import type { IdentityTestApp } from './identity-test-app.js';
import { AccessTokenClaimsReader } from './access-token-claims.js';
import { DeviceKey } from './device-key.js';

/** Un usuario de prueba que recorre identity por HTTP como lo haría la app. */
export class IdentityJourney {
  static readonly PASSWORD = [
    'Una',
    'frase',
    'larga',
    'de',
    'prueba',
    '2026',
  ].join('-');

  readonly device = new DeviceKey();
  /** IP propia del usuario de prueba, derivada de su email: cada uno tiene su límite de tasa. */
  private ip: string;

  constructor(
    private readonly app: IdentityTestApp,
    readonly email: string,
  ) {
    const byte = createHash('sha256').update(email).digest()[0] ?? 0;
    this.ip = `203.0.113.${(byte % 250) + 1}`;
  }

  /** Sigue desde otra red: las rutas públicas tienen un límite por IP y una prueba larga lo alcanza. */
  moveTo(ip: string): this {
    this.ip = ip;
    return this;
  }

  native(): HttpTestClient {
    return this.app.nativeClient(this.ip);
  }

  web(): HttpTestClient {
    return this.app.client(this.ip);
  }

  bearer(accessToken: string): HttpTestClient {
    return this.app
      .client(this.ip)
      .withHeaders({ Authorization: `Bearer ${accessToken}` });
  }

  /** Se registra y confirma el email con el token del correo. */
  async register(): Promise<void> {
    const signUp = await this.signUp();
    IdentityJourney.expectStatus(signUp, 202);
    const token = this.mailTo(IdentityEmailTemplate.EmailVerification).token;
    const confirm = await this.native().post(
      '/v1/auth/email-verifications/confirm',
      {
        body: { token },
      },
    );
    IdentityJourney.expectStatus(confirm, 204);
  }

  signUp(invitationToken?: string): Promise<HttpTestResponse> {
    return this.native().post('/v1/auth/sign-up', {
      body: {
        email: this.email,
        password: IdentityJourney.PASSWORD,
        displayName: 'Persona de prueba',
        locale: 'es-MX',
        ...(invitationToken === undefined ? {} : { invitationToken }),
      },
    });
  }

  /** El id del usuario, leído del access token de una de sus sesiones. */
  static userIdFrom(accessToken: string): string {
    return String(AccessTokenClaimsReader.read(accessToken)['sub']);
  }

  signIn(
    client: HttpTestClient = this.native(),
    password = IdentityJourney.PASSWORD,
  ): Promise<HttpTestResponse> {
    return client.post('/v1/auth/sign-in', {
      body: { email: this.email, password },
    });
  }

  /** Inicia sesión desde un dispositivo nuevo con el código del email y registra la clave del dispositivo. */
  async signInWithEmailCode(): Promise<SessionTokensBody> {
    const signIn = await this.signIn();
    const mfaToken = (signIn.body as { mfa: { mfaToken: string } }).mfa
      .mfaToken;
    const challenge = await this.native().post('/v1/auth/mfa/challenges', {
      body: { mfaToken, method: 'email_otp' },
    });
    const challengeId = (challenge.body as { challengeId: string }).challengeId;
    const code = this.mailTo(IdentityEmailTemplate.MfaCode).code;
    const verify = await this.native().post('/v1/auth/mfa/verify', {
      body: {
        mfaToken,
        challengeId,
        code,
        devicePublicKey: this.device.publicKey,
      },
    });
    IdentityJourney.expectStatus(verify, 200);
    return (verify.body as { tokens: SessionTokensBody }).tokens;
  }

  /** El id público del dispositivo, armado con los claims de un access token de una sesión suya. */
  static deviceIdFrom(accessToken: string): string {
    const claims = AccessTokenClaimsReader.read(accessToken);
    return ['dv1', claims['sub'], claims['htid'], claims['did']].join('_');
  }

  /** La app verificadora pide sus aprobaciones con una petición firmada y devuelve el código del desafío. */
  async approvalCode(deviceId: string, challengeId: string): Promise<string> {
    const pull = await this.native().post('/v1/auth/device-approvals/pull', {
      body: this.device.signed('identity.device-approvals.pull', deviceId),
    });
    IdentityJourney.expectStatus(pull, 200);
    const approvals = (
      pull.body as { approvals: Array<{ challengeId: string; code: string }> }
    ).approvals;
    const approval = approvals.find(
      (candidate) => candidate.challengeId === challengeId,
    );
    if (approval === undefined) {
      throw new Error(`No approval for ${challengeId}`);
    }
    return approval.code;
  }

  mailTo(template: IdentityEmailTemplate): Readonly<Record<string, string>> {
    const sent = this.app.mailer().lastTo(this.email, template);
    if (sent === undefined) {
      throw new Error(`No ${template} email for ${this.email}`);
    }
    return sent.variables;
  }

  static expectStatus(response: HttpTestResponse, status: number): void {
    if (response.status !== status) {
      throw new Error(
        `Expected ${status}, got ${response.status}: ${response.text}`,
      );
    }
  }
}

/** Los tokens que responde un inicio de sesión en la app nativa. */
export interface SessionTokensBody {
  readonly accessToken: string;
  readonly accessExpiresAt: string;
  readonly sessionToken: string;
}
