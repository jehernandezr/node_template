import type { PendingEmailProof } from './pending-email-proof.js';

/** What a token was sent by email for. */
export enum EmailProofPurpose {
  Verification = 'verification',
  Change = 'change',
}

/** Single-use tokens that prove the user controls an email. They live 24 hours. */
export abstract class EmailProofStore {
  /**
   * Saves the proof and returns the token that travels in the email.
   * @param purpose What the proof is for.
   * @param proof Data of the proof.
   * @returns The token.
   */
  abstract issue(
    purpose: EmailProofPurpose,
    proof: PendingEmailProof,
  ): Promise<string>;

  /**
   * Consumes the token: a second time returns `undefined`.
   * @param purpose What the proof is for.
   * @param token Token from the email.
   * @returns The proof, or `undefined`.
   */
  abstract consume(
    purpose: EmailProofPurpose,
    token: string,
  ): Promise<PendingEmailProof | undefined>;
}
