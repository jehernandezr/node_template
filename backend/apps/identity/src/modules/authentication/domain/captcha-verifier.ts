/**
 * Verifies a CAPTCHA response before accepting an attempt from a suspicious origin. While there is no
 * provider, the adapter approves everything: the IP lockout lives in Valkey and the WAF rule arrives
 * with the infrastructure.
 */
export abstract class CaptchaVerifier {
  /** `true` if the response is valid for that IP. Without a response, only a permissive adapter approves. */
  abstract verify(response: string | undefined, ip: string): Promise<boolean>;
}
