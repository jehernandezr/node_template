import {
  SignInStatus,
  type PendingMfa,
  type SignInResponse,
} from '@contracts/identity';
import type { RegionLocation } from '../types/region-location.type.js';

/** The tokens of a newly opened session. */
export interface OpenedSession {
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  readonly sessionToken: string;
}

/** The two responses of a sign-in: open session or pending second factor. */
export class SignInResponses {
  /**
   * Builds the response of a sign-in that opened a session.
   * @param session Opened session with its tokens.
   * @param location Region of the user.
   * @returns The response.
   */
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

  /**
   * Builds the response of a sign-in that needs a second factor.
   * @param pending Pending authentication.
   * @returns The response.
   */
  static mfaRequired(pending: PendingMfa): SignInResponse {
    return { status: SignInStatus.MfaRequired, mfa: pending };
  }
}
