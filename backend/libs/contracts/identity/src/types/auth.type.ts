import type { MfaFactor, SignInStatus } from '../enums/auth.enum.js';

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
}

/** Verificación de un desafío MFA. */
export interface MfaVerifyRequest {
  mfaToken: string;
  method: MfaFactor;
  code: string;
  /** Clave pública del dispositivo en base64url; solo al registrar uno nuevo. */
  devicePublicKey?: string;
}
