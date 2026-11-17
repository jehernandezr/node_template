import { CaptchaVerifier } from '../../domain/captcha-verifier.js';

/** `CaptchaVerifier` de prueba: aprueba solo las respuestas dadas y anota cada consulta. */
export class RecordingCaptchaVerifier extends CaptchaVerifier {
  readonly checked: Array<{ response?: string; ip: string }> = [];

  constructor(private readonly valid: readonly string[]) {
    super();
  }

  async verify(response: string | undefined, ip: string): Promise<boolean> {
    this.checked.push({ ...(response === undefined ? {} : { response }), ip });
    return response !== undefined && this.valid.includes(response);
  }
}
