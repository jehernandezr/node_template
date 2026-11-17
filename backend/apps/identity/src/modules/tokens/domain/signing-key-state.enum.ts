/** Momento de una clave de firma dentro de su rotación. */
export enum SigningKeyState {
  /** Firma los tokens nuevos. Hay una sola. */
  Active = 'active',
  /** Ya no firma (o todavía no), pero sus tokens siguen siendo válidos: se publica en el JWKS. */
  Verifying = 'verifying',
  /** Comprometida o vencida: no firma ni se publica. */
  Retired = 'retired',
}
