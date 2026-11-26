import { Injectable } from '@nestjs/common';
import {
  BloomRebuildSourceProvider,
  type BloomRebuildSource,
} from '@platform/bloom';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import {
  COMMON_PASSWORD_SUFFIXES,
  COMMON_PASSWORD_WORDS,
  KNOWN_BREACHED_PASSWORDS,
} from './known-breached-passwords.js';

/**
 * Source of truth of the breached passwords Bloom: the bootstrap list and each common word with its
 * usual suffixes, in lowercase and only those the policy would let through by length (the rest are already
 * rejected earlier).
 */
@Injectable()
export class KnownBreachedPasswordsSource extends BloomRebuildSourceProvider {
  private static readonly BATCH = 250;

  /** All passwords, normalized and without duplicates. */
  passwords(): readonly string[] {
    const combined = [
      ...KNOWN_BREACHED_PASSWORDS,
      ...COMMON_PASSWORD_WORDS.flatMap((word) => [
        word.repeat(2),
        ...COMMON_PASSWORD_SUFFIXES.map((suffix) => `${word}${suffix}`),
        ...COMMON_PASSWORD_SUFFIXES.map(
          (suffix) =>
            `${word.charAt(0).toUpperCase()}${word.slice(1)}${suffix}`,
        ),
      ]),
    ];
    return [
      ...new Set(
        combined
          .map((password) => KnownBreachedPasswordsSource.normalize(password))
          .filter(
            (password) =>
              [...password].length >= IdentityDefaults.passwordMinLength,
          ),
      ),
    ];
  }

  override batches(): BloomRebuildSource {
    const all = this.passwords();
    const batches: string[][] = [];
    for (let i = 0; i < all.length; i += KnownBreachedPasswordsSource.BATCH) {
      batches.push(all.slice(i, i + KnownBreachedPasswordsSource.BATCH));
    }
    return batches;
  }

  /** Public lists are compared case-insensitively. */
  static normalize(password: string): string {
    return password.toLowerCase();
  }
}
