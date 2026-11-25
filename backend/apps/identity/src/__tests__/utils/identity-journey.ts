import { createHash } from 'node:crypto';
import { IdentityRoute } from '@contracts/identity';
import type {
  HttpTestClient,
  HttpTestResponse,
} from '@platform/http/test-utils';
import { IdentityEmailTemplate } from '../../shared/enums/identity-email-template.enum.js';
import type { IdentityEntry } from './identity-entry.js';
import { AccessTokenClaimsReader } from './access-token-claims.js';
import { DeviceKey } from './device-key.js';

/** A test user who goes through identity over HTTP as the app would. */
export class IdentityJourney {
  static readonly PASSWORD = [
    'A',
    'long',
    'test',
    'phrase',
    'for',
    '2026',
  ].join('-');

  readonly device = new DeviceKey();
  /** Own IP of the test user, derived from their email: each one has their own rate limit. */
  private ip: string;

  constructor(
    private readonly app: IdentityEntry,
    readonly email: string,
  ) {
    const byte = createHash('sha256').update(email).digest()[0] ?? 0;
    this.ip = `203.0.113.${(byte % 250) + 1}`;
  }

  /** Continues from another network: public routes have a per-IP limit and a long test reaches it. */
  moveTo(ip: string): this {
    this.ip = ip;
    return this;
  }

  /**
   * Client of the native app, which receives the session token in the body.
   * @returns The client.
   */
  native(): HttpTestClient {
    return this.app.nativeClient(this.ip);
  }

  /**
   * Client of the web app, which receives the session token in a cookie.
   * @returns The client.
   */
  web(): HttpTestClient {
    return this.app.client(this.ip);
  }

  /**
   * Client authenticated with an access token.
   * @param accessToken Access token of a session.
   * @returns The client.
   */
  bearer(accessToken: string): HttpTestClient {
    return this.app
      .client(this.ip)
      .withHeaders({ Authorization: `Bearer ${accessToken}` });
  }

  /** Signs up and confirms the email with the token of the message. */
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

  /**
   * Signs up, optionally with an invitation.
   * @param invitationToken Token of the invitation email.
   * @returns The response.
   */
  signUp(invitationToken?: string): Promise<HttpTestResponse> {
    return this.native().post('/v1/auth/sign-up', {
      body: {
        email: this.email,
        password: IdentityJourney.PASSWORD,
        displayName: 'Test person',
        locale: 'es-MX',
        ...(invitationToken === undefined ? {} : { invitationToken }),
      },
    });
  }

  /**
   * Reads the user id from the access token of one of their sessions.
   * @param accessToken Access token.
   * @returns The user id.
   */
  static userIdFrom(accessToken: string): string {
    return String(AccessTokenClaimsReader.read(accessToken)['sub']);
  }

  /**
   * Signs in with the password and no device proof.
   * @param client Client that signs in.
   * @param password Password to send.
   * @returns The response.
   */
  signIn(
    client: HttpTestClient = this.native(),
    password = IdentityJourney.PASSWORD,
  ): Promise<HttpTestResponse> {
    return client.post('/v1/auth/sign-in', {
      body: { email: this.email, password },
    });
  }

  /**
   * Signs in with the password from the registered device, with its signature as proof.
   * @param deviceId Public id of the device.
   * @param client Client that signs in.
   * @returns The response.
   */
  signInFromDevice(
    deviceId: string,
    client: HttpTestClient = this.native(),
  ): Promise<HttpTestResponse> {
    return client.post('/v1/auth/sign-in', {
      body: {
        email: this.email,
        password: IdentityJourney.PASSWORD,
        device: this.device.signed(IdentityRoute.SignIn, deviceId, [
          this.email,
        ]),
      },
    });
  }

  /** Signs in from a new device with the email code and registers the device key. */
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

  /**
   * Builds the public device id from the claims of an access token of one of its sessions.
   * @param accessToken Access token.
   * @returns The public device id.
   */
  static deviceIdFrom(accessToken: string): string {
    const claims = AccessTokenClaimsReader.read(accessToken);
    return ['dv1', claims['sub'], claims['htid'], claims['did']].join('_');
  }

  /**
   * The verifier app pulls its approvals with a signed request.
   * @param deviceId Public id of the verifier device.
   * @param challengeId Challenge whose code is wanted.
   * @returns The code of the challenge.
   */
  async approvalCode(deviceId: string, challengeId: string): Promise<string> {
    const pull = await this.native().post('/v1/auth/device-approvals/pull', {
      body: this.device.signed(IdentityRoute.PullDeviceApprovals, deviceId),
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

  /**
   * Reads the variables of the last email of a template sent to the user.
   * @param template Email template.
   * @returns The variables of the email.
   */
  mailTo(template: IdentityEmailTemplate): Readonly<Record<string, string>> {
    const sent = this.app.mailer().lastTo(this.email, template);
    if (sent === undefined) {
      throw new Error(`No ${template} email for ${this.email}`);
    }
    return sent.variables;
  }

  /**
   * Fails with the response text when the status is not the expected one.
   * @param response Response.
   * @param status Expected status.
   */
  static expectStatus(response: HttpTestResponse, status: number): void {
    if (response.status !== status) {
      throw new Error(
        `Expected ${status}, got ${response.status}: ${response.text}`,
      );
    }
  }
}

/** Tokens a sign-in answers to the native app. */
export interface SessionTokensBody {
  readonly accessToken: string;
  readonly accessExpiresAt: string;
  readonly sessionToken: string;
}
