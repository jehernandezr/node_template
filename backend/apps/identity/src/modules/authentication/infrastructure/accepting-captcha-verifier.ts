import { CaptchaVerifier } from '../domain/captcha-verifier.js';

/** `CaptchaVerifier` without a provider: approves every response, including a missing one. */
export class AcceptingCaptchaVerifier extends CaptchaVerifier {
  async verify(): Promise<boolean> {
    return true;
  }
}
