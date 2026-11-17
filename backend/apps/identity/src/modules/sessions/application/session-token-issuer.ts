import { Injectable } from '@nestjs/common';
import { SessionTokens } from '@contracts/identity';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { TokensFacade } from '../../tokens/index.js';
import { SessionToken } from '../domain/session-token.js';
import { Session, type SessionState } from '../domain/session.js';

/**
 * Arma los tokens de una sesión: el session token opaco de su generación y el access token. El secreto de
 * cada generación es el HMAC, con la llave del servicio, de la sesión, su sal y la generación: así se puede
 * verificar cualquier generación anterior y distinguir un token viejo verdadero de uno inventado, y una
 * copia de la base sin la llave no sirve para armar tokens.
 */
@Injectable()
export class SessionTokenIssuer {
  private static readonly SALT_BYTES = 32;

  constructor(
    private readonly tokens: TokensFacade,
    private readonly generator: SecretGenerator,
    private readonly hasher: SecretHasher,
  ) {}

  newSalt(): string {
    return this.generator
      .bytes(SessionTokenIssuer.SALT_BYTES)
      .toString('base64url');
  }

  /** Session token de la generación vigente de la sesión. */
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

  /** Access token de la sesión con su tenant activo, sus métodos y su tope absoluto. */
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

  /** Comprueba en tiempo constante el secreto presentado para una generación de la sesión. */
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
