/** Valores de `INTERNAL_API_SIGNER`: cómo firma un servicio sus llamadas internas. */
export enum InternalApiSignerKind {
  /** HMAC-SHA256 con un secreto compartido entre servicios. */
  Hmac = 'hmac',
  /** AWS Signature V4 con el rol del servicio; el destino la verifica con IAM. */
  SigV4 = 'sigv4',
}
