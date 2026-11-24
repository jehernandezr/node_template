import {
  SignInStatus,
  type PendingMfa,
  type SignInResponse,
} from '@contracts/identity';
import type { RegionLocation } from './deployment-region.js';

/** Los tokens de una sesión recién abierta. */
export interface OpenedSession {
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly sessionToken: string;
}

/** Las dos respuestas de un inicio de sesión: sesión abierta o segundo factor pendiente. */
export class SignInResponses {
  static authenticated(
    session: OpenedSession,
    location: RegionLocation,
  ): SignInResponse {
    return {
      status: SignInStatus.Authenticated,
      tokens: {
        accessToken: session.accessToken,
        accessExpiresAt: session.accessExpiresAt.toISOString(),
        sessionToken: session.sessionToken,
      },
      ...location,
    };
  }

  static mfaRequired(pending: PendingMfa): SignInResponse {
    return { status: SignInStatus.MfaRequired, mfa: pending };
  }
}
