import type { PlatformRole } from '../enums/access.enum.js';
import type {
  AuthMethodReference,
  MfaFactor,
  SignInStatus,
  TokenAudience,
} from '../enums/auth.enum.js';

/** Email y contraseña. `deviceId` es el id firmado que el cliente guardó en su primer login. */
export interface SignInRequest {
  email: string;
  password: string;
  deviceId?: string;
}

/** Tokens emitidos por un login completo o un refresh. */
export interface SessionTokens {
  /** JWT de corta vida; el cliente lo guarda solo en memoria. */
  accessToken: string;
  /** Instante ISO 8601 en que vence `accessToken`. */
  accessExpiresAt: string;
  /** Session token opaco. No viene en web, donde vive en una cookie httpOnly. */
  sessionToken?: string;
}

/** Desafío MFA pendiente. */
export interface PendingMfa {
  /** Token que liga el desafío con el login que lo pidió. */
  mfaToken: string;
  methods: MfaFactor[];
}

/** Resultado de un login o de una verificación MFA. */
export interface SignInResponse {
  status: SignInStatus;
  /** Presente cuando `status` es `authenticated`. */
  tokens?: SessionTokens;
  /** Presente cuando `status` es `mfa_required`. */
  mfa?: PendingMfa;
  /** Región donde viven los datos del tenant. Presente con `authenticated`. */
  region?: string;
  /** URL base de la API de esa región. Presente con `authenticated`. */
  apiBaseUrl?: string;
}

/** Pedido de un desafío MFA con uno de los métodos ofrecidos. */
export interface MfaChallengeRequest {
  mfaToken: string;
  method: MfaFactor;
}

/** Desafío MFA creado. El código llega por el método elegido. */
export interface MfaChallenge {
  /** Id del desafío; se envía al verificar. */
  challengeId: string;
  method: MfaFactor;
  /** Instante ISO 8601 en que vence el código. */
  expiresAt: string;
  /** Dígitos del código, cuando el método envía uno (dispositivo o email). */
  codeLength?: number;
}

/** Verificación de un desafío MFA. */
export interface MfaVerifyRequest {
  mfaToken: string;
  /** Desafío pedido con `POST /v1/auth/mfa/challenges`. */
  challengeId: string;
  code: string;
  /** Clave pública del dispositivo en base64url; solo al registrar uno nuevo. */
  devicePublicKey?: string;
}

/**
 * Session token de un refresh o de un cierre de sesión. En web no viaja en el
 * cuerpo: el navegador envía la cookie `httpOnly` y el servidor la lee de ahí.
 */
export interface SessionTokenRequest {
  sessionToken?: string;
}

/** Verificación del paso adicional (step-up) de una sesión abierta. */
export interface StepUpVerifyRequest {
  /** Token del paso adicional, de `POST /v1/me/step-up`. */
  mfaToken: string;
  /** Desafío pedido con `POST /v1/me/step-up/challenges`. */
  challengeId: string;
  code: string;
}

/** Resultado de un paso adicional verificado. */
export interface StepUpResult {
  /** Access token nuevo, con `auth_time` y `amr` del segundo factor recién verificado. */
  tokens: SessionTokens;
  /** Instante ISO 8601 del segundo factor; es el nuevo `mfaVerifiedAt` de la sesión. */
  mfaVerifiedAt: string;
}

/** Claims del access token JWT (ADR 0022). Los instantes son epoch en segundos. */
export interface AccessTokenClaims {
  /** Emisor de la región. */
  iss: string;
  aud: TokenAudience;
  /** Id del usuario. */
  sub: string;
  /** Tenant activo. */
  tid: string;
  /** Tenant de origen del usuario, con el que se enruta su shard. */
  htid: string;
  /** Sesión. */
  sid: string;
  /** Dispositivo, si la sesión tiene uno. */
  did?: string;
  amr: AuthMethodReference[];
  /** Última autenticación interactiva, incluido el step-up. */
  auth_time: number;
  /** Roles del usuario en el tenant activo. */
  roles: string[];
  /** Roles de plataforma. */
  proles: PlatformRole[];
  /** Versión de permisos: `<versión del tenant>.<versión del usuario en el tenant>`. */
  pv: string;
  /** Región de residencia. */
  rgn: string;
  /** Tope absoluto de la sesión. */
  sxp: number;
  iat: number;
  exp: number;
  jti: string;
}
