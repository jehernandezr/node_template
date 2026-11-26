import { Injectable } from '@nestjs/common';
import { SessionTokens } from '@contracts/identity';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { TokensFacade } from '../../tokens/index.js';
import { SessionToken } from '../domain/session-token.js';
import { Session, type SessionState } from '../domain/session.js';

/**
 * Builds a session's tokens: the opaque session token of its generation and the access token. The secret of
 * each generation is the HMAC, with the service key, of the session, its salt and the generation: this way any
 * previous generation can be verified and a real old token can be told apart from a forged one, and a
 * copy of the database without the key cannot be used to build tokens.
 */
@Injectable()
export class SessionTokenIssuer {
  private static readonly SALT_BYTES = 32;

  constructor(
    private readonly tokens: TokensFacade,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
  ) {}

  /**
   * Generates the random salt of a new session.
   * @returns The salt.
   */
  newSalt(): string {
    return this.generator
      .bytes(SessionTokenIssuer.SALT_BYTES)
      .toString('base64url');
  }

  /**
   * Session token of the session's current generation.
   * @param session Session to sign.
   * @returns The session token.
   */
  sessionToken(session: Session): string {
    const state = session.snapshot();
    return new SessionToken(
      state.userId,
      state.homeTenantId,
      state.id,
      state.generation,
      Buffer.from(
        this.hasher.digest(this.material(state, state.generation)),
        'base64url',
      ),
    ).format();
  }

  /**
   * The session's access token with its active tenant, its methods and its absolute cap.
   * @param session Session to sign.
   * @returns The access token and its expiry.
   */
  async accessToken(
    session: Session,
  ): Promise<Pick<SessionTokens, 'accessToken'> & { accessExpiresAt: Date }> {
    const state = session.snapshot();
    return this.tokens.issue({
      userId: state.userId,
      tenantId: state.activeTenantId,
      homeTenantId: state.homeTenantId,
      sessionId: state.id,
      ...(state.deviceId === undefined ? {} : { deviceId: state.deviceId }),
      authMethods: state.amr,
      authTime: state.authTime,
      sessionExpiresAt: state.absoluteExpiresAt,
    });
  }

  /**
   * Checks in constant time the presented secret for a generation of the session.
   * @param session Session to check.
   * @param generation Presented generation.
   * @param secret Presented secret.
   * @returns `true` when it matches.
   */
  matches(session: Session, generation: number, secret: Buffer): boolean {
    return this.hasher.matches(
      this.material(session.snapshot(), generation),
      secret.toString('base64url'),
    );
  }

  private material(state: SessionState, generation: number): string {
    return [SessionToken.PREFIX, state.id, state.tokenSalt, generation].join(
      '|',
    );
  }
}
