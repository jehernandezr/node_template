/** Huella estable de un email normalizado: el catálogo guarda la huella, nunca el email. */
export abstract class EmailFingerprinter {
  abstract fingerprint(normalizedEmail: string): Buffer;
}
