import { CaptchaVerifier } from '../domain/captcha-verifier.js';

/** `CaptchaVerifier` sin proveedor: aprueba toda respuesta, también la ausente. */
export class AcceptingCaptchaVerifier extends CaptchaVerifier {
  async verify(): Promise<boolean> {
    return true;
  }
}
