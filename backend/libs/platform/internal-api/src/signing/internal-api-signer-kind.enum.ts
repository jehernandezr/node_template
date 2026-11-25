/** Values of `INTERNAL_API_SIGNER`: how a service signs its internal calls. */
export enum InternalApiSignerKind {
  /** HMAC-SHA256 with a secret shared between services. */
  Hmac = 'hmac',
  /** AWS Signature V4 with the service role; the target verifies it with IAM. */
  SigV4 = 'sigv4',
}
