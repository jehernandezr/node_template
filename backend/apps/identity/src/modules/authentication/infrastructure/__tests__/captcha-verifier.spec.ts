import { RecordingCaptchaVerifier } from '../../__tests__/utils/index.js';
import type { CaptchaVerifier } from '../../domain/captcha-verifier.js';
import { AcceptingCaptchaVerifier } from '../accepting-captcha-verifier.js';

const IP = '203.0.113.30';

describe('AcceptingCaptchaVerifier', () => {
  it.each([
    ['a response', 'response'],
    ['no response', undefined],
  ])('approves %s while there is no provider', async (_case, response) => {
    const verifier: CaptchaVerifier = new AcceptingCaptchaVerifier();

    await expect(verifier.verify(response, IP)).resolves.toBe(true);
  });
});

describe('RecordingCaptchaVerifier', () => {
  it('approves only the given responses and records each check', async () => {
    const verifier = new RecordingCaptchaVerifier(['valid']);

    const results = [
      await verifier.verify('valid', IP),
      await verifier.verify('other', IP),
      await verifier.verify(undefined, IP),
    ];

    expect(results).toEqual([true, false, false]);
    expect(verifier.checked).toEqual([
      { response: 'valid', ip: IP },
      { response: 'other', ip: IP },
      { ip: IP },
    ]);
  });
});
