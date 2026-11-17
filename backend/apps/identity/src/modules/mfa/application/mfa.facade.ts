import type {
  AuthMethodReference,
  PendingMfa,
  SignInResponse,
  StepUpResult,
} from '@contracts/identity';
import type { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import type { StartPendingInput } from '../domain/start-pending-input.js';

/** Lo que `mfa` ofrece a los otros módulos. */
export abstract class MfaFacade {
  /** Guarda la autenticación pendiente y devuelve el `mfaToken` con los métodos que se ofrecen. */
  abstract startPending(input: StartPendingInput): Promise<PendingMfa>;
  /** "No fui yo" desde el dispositivo verificador: el desafío deja de aceptar su código. */
  abstract denyChallenge(challengeId: string): Promise<void>;
  /** La autenticación pendiente de ese `mfaToken` y propósito, o `undefined` si venció o no existe. */
  abstract pending(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<PendingAuthentication | undefined>;
  /**
   * Completa un inicio de sesión pendiente con un segundo factor verificado fuera de `mfa` (una passkey) y
   * abre la sesión.
   * @throws IdentityError `IDENTITY.MFA.TOKEN_INVALID` si el token ya se usó.
   */
  abstract completeSignIn(
    mfaToken: string,
    methods: readonly AuthMethodReference[],
    devicePublicKey?: string,
  ): Promise<SignInResponse>;
  /** Completa un step-up pendiente con un segundo factor verificado fuera de `mfa`. */
  abstract completeStepUp(
    mfaToken: string,
    method: AuthMethodReference,
  ): Promise<StepUpResult>;
}
