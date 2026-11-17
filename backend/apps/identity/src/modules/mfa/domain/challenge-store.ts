import type { MfaChallengeRecord } from './mfa-challenge.js';

/**
 * Desafíos MFA con intentos atómicos y un solo uso: dos réplicas no pueden contar dos veces el mismo intento
 * ni aceptar dos veces el mismo código.
 */
export abstract class ChallengeStore {
  abstract save(challenge: MfaChallengeRecord): Promise<void>;
  abstract find(challengeId: string): Promise<MfaChallengeRecord | undefined>;
  /** Suma un intento y devuelve cuántos lleva. */
  abstract attempt(challengeId: string): Promise<number>;
  /** Consume el desafío; devuelve `false` si ya se usó o no existe. */
  abstract consume(challengeId: string): Promise<boolean>;
  /** Suma un desafío pedido por la autenticación pendiente en su ventana y devuelve cuántos lleva. */
  abstract countRequest(pendingId: string, windowMs: number): Promise<number>;
}
