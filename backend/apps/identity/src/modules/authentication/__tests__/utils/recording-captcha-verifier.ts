import { CaptchaVerifier } from '../../domain/captcha-verifier.js';

/** Test `CaptchaVerifier`: approves only the given responses and records each query. */
export class RecordingCaptchaVerifier extends CaptchaVerifier {
  readonly checked: Array<{ response?: string; ip: string }> = [];

  constructor(private readonly valid: readonly string[]) {
    super();
  }

  override async verify(
    response: string | undefined,
    ip: string,
  ): Promise<boolean> {
    this.checked.push({ ...(response === undefined ? {} : { response }), ip });
    return response !== undefined && this.valid.includes(response);
  }
}
