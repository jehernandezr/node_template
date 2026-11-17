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
 * Fuente de verdad del Bloom de contraseñas filtradas: la lista de arranque y cada palabra común con sus
 * sufijos habituales, en minúsculas y solo las que la política dejaría pasar por largo (las demás ya se
 * rechazan antes).
 */
@Injectable()
export class KnownBreachedPasswordsSource extends BloomRebuildSourceProvider {
  private static readonly BATCH = 250;

  /** Todas las contraseñas, normalizadas y sin repetir. */
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

  batches(): BloomRebuildSource {
    const all = this.passwords();
    const batches: string[][] = [];
    for (let i = 0; i < all.length; i += KnownBreachedPasswordsSource.BATCH) {
      batches.push(all.slice(i, i + KnownBreachedPasswordsSource.BATCH));
    }
    return batches;
  }

  /** Las listas públicas se comparan sin distinguir mayúsculas. */
  static normalize(password: string): string {
    return password.toLowerCase();
  }
}
