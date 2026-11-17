import type { PendingEmailProof } from './pending-email-proof.js';

/** Para qué se envió un token por email. */
export enum EmailProofPurpose {
  Verification = 'verification',
  Change = 'change',
}

/** Tokens de un solo uso que prueban que el usuario controla un email. Viven 24 horas. */
export abstract class EmailProofStore {
  /** Guarda la prueba y devuelve el token que viaja en el correo. */
  abstract issue(
    purpose: EmailProofPurpose,
    proof: PendingEmailProof,
  ): Promise<string>;

  /** Consume el token: una segunda vez devuelve `undefined`. */
  abstract consume(
    purpose: EmailProofPurpose,
    token: string,
  ): Promise<PendingEmailProof | undefined>;
}
