/**
 * Huella de un secreto de un solo uso (códigos, tokens opacos). Se guarda la huella, nunca el secreto: una
 * copia de la base no permite usar los tokens que contiene.
 */
export abstract class SecretHasher {
  /** Huella en base64url. Dos llamadas con el mismo valor dan la misma huella. */
  abstract digest(value: string | Uint8Array): string;

  /** Compara un valor con una huella guardada sin revelar dónde difieren. */
  abstract matches(value: string | Uint8Array, digest: string): boolean;
}
