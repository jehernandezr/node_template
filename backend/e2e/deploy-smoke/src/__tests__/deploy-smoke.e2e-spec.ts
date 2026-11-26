import { ListInvoicesRoute } from '@contracts/billing';
import {
  MfaFactor,
  RequestMfaChallengeRoute,
  SignInRoute,
  SignInStatus,
  VerifyMfaRoute,
} from '@contracts/identity';
import {
  AppNotificationSchema,
  NotificationFrameType,
  NotificationType,
} from '@contracts/notifications';
import { CreateTaskRoute, GetTaskRoute, TaskStatus } from '@contracts/tasks';
import { ContractClient } from '../contract-client.js';
import { NewDevice } from '../new-device.js';
import { SmokeSettings } from '../smoke-settings.js';
import type { SseEvent } from '../sse-frame-parser.js';
import { SseStream } from '../sse-stream.js';
import { TotpCode } from '../totp-code.js';

describe('deploy smoke over the public API, in order, as the smoke account', () => {
  const NOTICE_TIMEOUT_MS = 30_000;
  const CLOCK_SKEW_MS = 5_000;
  const STREAM_PATH = '/v1/notifications/stream';

  jest.setTimeout(120_000);

  const settings = SmokeSettings.from(process.env);
  const api = new ContractClient(settings.baseUrl);
  const { account } = settings;
  let accessToken = '';
  let signedInAt = 0;

  it('signs in with the smoke account and answers the new-device MFA challenge with the TOTP', async () => {
    signedInAt = Date.now();
    const signIn = await api.call(SignInRoute, {
      email: account.email,
      password: account.password,
    });
    const mfaToken = signIn.mfa?.mfaToken ?? '';
    const challenge = await api.call(RequestMfaChallengeRoute, {
      mfaToken,
      method: MfaFactor.Totp,
    });
    const verified = await api.call(VerifyMfaRoute, {
      mfaToken,
      challengeId: challenge.challengeId,
      code: TotpCode.at(account.totpSecret, Date.now()),
      devicePublicKey: new NewDevice().publicKey,
    });
    accessToken = verified.tokens?.accessToken ?? '';

    expect(signIn.status).toBe(SignInStatus.MfaRequired);
    expect(signIn.mfa?.methods).toContain(MfaFactor.Totp);
    expect(verified.status).toBe(SignInStatus.Authenticated);
    expect(accessToken).not.toBe('');
  });

  it('creates a task and reads it back', async () => {
    const title = `Deploy smoke ${new Date(signedInAt).toISOString()}`;

    const created = await api.call(CreateTaskRoute, { title }, accessToken);
    const read = await api.call(
      GetTaskRoute,
      { taskId: created.id },
      accessToken,
    );

    expect(read).toMatchObject({
      id: created.id,
      title,
      status: TaskStatus.Open,
    });
  });

  it('receives the security notice of its new device on the SSE stream', async () => {
    const since = signedInAt - CLOCK_SKEW_MS;
    const isNotice = (frame: SseEvent): boolean => {
      if (frame.event !== NotificationFrameType.Notification) return false;
      const notice = AppNotificationSchema.safeParse(frame.data);
      return (
        notice.success &&
        notice.data.type === NotificationType.SecurityAlert &&
        Date.parse(notice.data.createdAt) >= since
      );
    };
    const stream = await SseStream.open(
      api.url(STREAM_PATH),
      accessToken,
      SseStream.resumeIdAt(since),
    );

    try {
      await expect(
        stream.waitFor(isNotice, NOTICE_TIMEOUT_MS),
      ).resolves.toMatchObject({ event: NotificationFrameType.Notification });
    } finally {
      stream.close();
    }
  });

  it('lists the invoices of the smoke tenant as the contract describes them', async () => {
    const page = await api.call(ListInvoicesRoute, {}, accessToken);

    expect(Array.isArray(page.items)).toBe(true);
  });
});
