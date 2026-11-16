/**
 * Forma canónica de un email para buscarlo y guardarlo: sin espacios alrededor, en NFKC y en minúsculas.
 * Las dos formas que llegan del cliente (con y sin mayúsculas) dan la misma cuenta.
 */
export function normalizeEmail(email: string): string {
  return email.trim().normalize('NFKC').toLowerCase();
}
