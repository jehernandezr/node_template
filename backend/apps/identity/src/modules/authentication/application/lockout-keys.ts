import { Injectable } from '@nestjs/common';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';

/**
 * Llaves de los contadores de bloqueo. Son huellas: Valkey no guarda emails ni prefijos de API keys en
 * claro, y la misma cuenta da la misma llave en cualquier réplica.
 */
@Injectable()
export class LockoutKeys {
  constructor(private readonly hasher: SecretHasher) {}

  /** La cuenta de un email, para el modo protegido. */
  account(email: string): string {
    return this.hasher.digest(`account:${normalizeEmail(email)}`);
  }

  /** El origen de un intento: la cuenta, o la API key, desde una IP. */
  origin(subject: string, ip: string): string {
    return `${subject}:${ip}`;
  }

  /** Una API key por su prefijo: sus fallos cuentan como los de una cuenta. */
  apiKey(prefix: string): string {
    return this.hasher.digest(`api-key:${prefix}`);
  }
}
