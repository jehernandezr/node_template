import {
  SignInStatus,
  type PendingMfa,
  type SignInResponse,
} from '@contracts/identity';
import type { RegionLocation } from './deployment-region.js';

/** The tokens of a newly opened session. */
export interface OpenedSession {
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly sessionToken: string;
}

/** The two responses of a sign-in: open session or pending second factor. */
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
