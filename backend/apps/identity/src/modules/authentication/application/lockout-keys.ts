import { Injectable } from '@nestjs/common';
import { SecretHasher } from '../../../security/secret-hasher.js';
import { normalizeEmail } from '../../../shared/utils/email-normalization.js';

/**
 * Keys of the lockout counters. They are fingerprints: Valkey does not store emails or API key prefixes in
 * plain text, and the same account yields the same key on any replica.
 */
@Injectable()
export class LockoutKeys {
  constructor(private readonly hasher: SecretHasher) {}

  /**
   * The account of an email, for protected mode.
   * @param email Email of the account.
   * @returns The account key.
   */
  account(email: string): string {
    return this.hasher.digest(`account:${normalizeEmail(email)}`);
  }

  /**
   * The origin of an attempt: the account, or the API key, from an IP.
   * @param subject Account or API key key.
   * @param ip IP of the attempt.
   * @returns The origin key.
   */
  origin(subject: string, ip: string): string {
    return `${subject}:${ip}`;
  }

  /**
   * An API key by its prefix: its failures count like those of an account.
   * @param prefix Public prefix.
   * @returns The key of the API key.
   */
  apiKey(prefix: string): string {
    return this.hasher.digest(`api-key:${prefix}`);
  }
}
