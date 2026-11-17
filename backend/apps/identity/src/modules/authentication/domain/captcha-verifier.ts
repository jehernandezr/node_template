/**
 * Verifica la respuesta de un CAPTCHA antes de aceptar un intento desde un origen sospechoso. Mientras no
 * haya proveedor, el adaptador aprueba todo: el bloqueo por IP vive en Valkey y la regla del WAF llega
 * con la infraestructura.
 */
export abstract class CaptchaVerifier {
  /** `true` si la respuesta es válida para esa IP. Sin respuesta, solo un adaptador permisivo aprueba. */
  abstract verify(response: string | undefined, ip: string): Promise<boolean>;
}
