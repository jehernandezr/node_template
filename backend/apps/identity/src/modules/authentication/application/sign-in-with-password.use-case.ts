import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  AuthMethodReference,
  IdentityErrorCode,
  IdentityRoute,
  SecurityAlertType,
  UserStatus,
  type SignInRequest,
  type SignInResponse,
} from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { RequestContextStore } from '@platform/observability';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { DeploymentRegion } from '../../../sign-in/deployment-region.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { SignInResponses } from '../../../shared/utils/sign-in-responses.js';
import type { ClientInfo } from '../../../shared/types/client-info.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { SecurityAlerts } from '../../alerts/index.js';
import { DevicesFacade, type DeviceProof } from '../../devices/index.js';
import { MfaFacade } from '../../mfa/index.js';
import { PasswordsFacade } from '../../passwords/index.js';
import { SessionsFacade } from '../../sessions/index.js';
import { UsersFacade, type UserSnapshot } from '../../users/index.js';
import { MfaRequirementPolicy } from '../domain/mfa-requirement-policy.js';
import { LockoutKeys } from './lockout-keys.js';
import { LoginLockout } from './login-lockout.js';
import {
  LoginAttemptReason,
  LoginAttemptResult,
} from '../domain/login-attempt.js';
import { LoginAttemptRepository } from '../domain/login-attempt.repository.js';

/** Sign-in with email and password from a client. */
export interface SignInCommand {
  readonly request: SignInRequest;
  readonly client: ClientInfo;
}

/**
 * Password sign-in: checks the lockouts, verifies the password (against a dummy hash when there is no user),
 * recognizes the device by its signature and decides whether a second factor is needed. A failure counts
 * for the origin, the account and the IP, and is recorded as an attempt; an unknown email is recorded too,
 * without a user and in the shard of the default tenant, so both paths do the same kinds of work. The lookup of
 * the user and the shard of the attempt still differ, so their timing is not guaranteed to match.
 */
@Injectable()
export class SignInWithPassword {
  private readonly mfaPolicy = new MfaRequirementPolicy();

  constructor(
    private readonly users: UsersFacade,
    private readonly passwords: PasswordsFacade,
    private readonly devices: DevicesFacade,
    private readonly access: AccessFacade,
    private readonly mfa: MfaFacade,
    private readonly sessions: SessionsFacade,
    private readonly alerts: SecurityAlerts,
    private readonly lockout: LoginLockout,
    private readonly attempts: LoginAttemptRepository,
    private readonly keys: LockoutKeys,
    private readonly scopes: ShardScopes,
    private readonly context: RequestContextStore,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly deployment: DeploymentRegion,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * Signs a user in with their password.
   * @param command The request and the client that sends it.
   * @returns The open session, or the pending second factor.
   * @throws IdentityError `IDENTITY.AUTH.INVALID_CREDENTIALS`, with `Retry-After` while locked.
   * @throws IdentityError `IDENTITY.USER.SUSPENDED` or `IDENTITY.AUTH.EMAIL_NOT_VERIFIED` for those accounts.
   */
  async execute(command: SignInCommand): Promise<SignInResponse> {
    const { request, client } = command;
    const account = this.keys.account(request.email);
    const locked = await this.lockout.remainingLockMs(account, client.ip);
    if (locked !== undefined) {
      throw IdentityError.retryAfter(
        IdentityErrorCode.AuthInvalidCredentials,
        locked,
      );
    }
    const user = await this.users.findByEmail(request.email);
    const ref = user === undefined ? undefined : SignInWithPassword.refOf(user);
    if (!(await this.passwords.verify(ref, request.password))) {
      await this.fail(ref, account, client);
    }
    if (user === undefined || ref === undefined) {
      return this.fail(undefined, account, client);
    }
    await this.assertCanSignIn(user, ref, client, account);
    await this.lockout.clear(account, client.ip);
    await this.record(ref, client, LoginAttemptResult.Succeeded);
    return this.continueWith(
      ref,
      SignInWithPassword.proofOf(request),
      client,
      account,
    );
  }

  private async continueWith(
    ref: UserRef,
    proof: DeviceProof | undefined,
    client: ClientInfo,
    account: string,
  ): Promise<SignInResponse> {
    const recognition = await this.devices.recognize(ref, proof);
    const tenantId = await this.access.defaultTenant(ref);
    const needsMfa = this.mfaPolicy.requiresSecondFactor({
      deviceRecognized: recognition.recognized,
      privileged: await this.access.requiresMfaOnEveryLogin(ref, tenantId),
      protectedMode: await this.lockout.isProtected(account),
    });
    const deviceId = recognition.device?.id;
    if (needsMfa) {
      return SignInResponses.mfaRequired(
        await this.mfa.startPending({
          user: ref,
          purpose: PendingPurpose.SignIn,
          client,
          ...(deviceId === undefined ? {} : { deviceId }),
          authMethods: [AuthMethodReference.Password],
        }),
      );
    }
    const session = await this.sessions.createSession({
      user: ref,
      ...(deviceId === undefined ? {} : { deviceId }),
      authMethods: [AuthMethodReference.Password],
      authTime: this.clock.now(),
      client,
    });
    return SignInResponses.authenticated(session, this.deployment.location());
  }

  private async assertCanSignIn(
    user: UserSnapshot,
    ref: UserRef,
    client: ClientInfo,
    account: string,
  ): Promise<void> {
    if (user.status === UserStatus.Deleted) {
      await this.fail(undefined, account, client);
    }
    if (user.status === UserStatus.Suspended) {
      await this.record(
        ref,
        client,
        LoginAttemptResult.Failed,
        LoginAttemptReason.Suspended,
      );
      throw new IdentityError(IdentityErrorCode.UserSuspended);
    }
    if (user.status === UserStatus.PendingVerification) {
      await this.record(
        ref,
        client,
        LoginAttemptResult.Failed,
        LoginAttemptReason.EmailNotVerified,
      );
      throw new IdentityError(IdentityErrorCode.AuthEmailNotVerified);
    }
  }

  private async fail(
    ref: UserRef | undefined,
    account: string,
    client: ClientInfo,
  ): Promise<never> {
    const outcome = await this.lockout.recordFailure(account, client.ip);
    await this.record(
      ref,
      client,
      LoginAttemptResult.Failed,
      ref === undefined
        ? LoginAttemptReason.UnknownAccount
        : LoginAttemptReason.InvalidPassword,
    );
    if (ref !== undefined && outcome.lockedForMs !== undefined) {
      await this.alerts.raise({
        type: SecurityAlertType.AccountLocked,
        user: ref,
      });
    }
    if (ref !== undefined && outcome.protectedModeEnabled) {
      await this.alerts.raise({
        type: SecurityAlertType.ProtectedModeEnabled,
        user: ref,
      });
    }
    throw outcome.lockedForMs === undefined
      ? new IdentityError(IdentityErrorCode.AuthInvalidCredentials)
      : IdentityError.retryAfter(
          IdentityErrorCode.AuthInvalidCredentials,
          outcome.lockedForMs,
        );
  }

  private async record(
    ref: UserRef | undefined,
    client: ClientInfo,
    result: LoginAttemptResult,
    reason?: LoginAttemptReason,
  ): Promise<void> {
    const traceId = this.context.current()?.traceId;
    const write = () =>
      this.attempts.record({
        id: this.ids.next().toString(),
        userId: ref?.userId ?? null,
        result,
        ...(reason === undefined ? {} : { reason }),
        ip: client.ip,
        ...(traceId === undefined ? {} : { traceId }),
        attemptedAt: this.clock.now(),
      });
    await (ref === undefined
      ? this.scopes.inTenantShard(
          this.settings.values.IDENTITY_DEFAULT_TENANT_ID,
          write,
        )
      : this.scopes.inUserShard(ref, write));
  }

  private static proofOf(request: SignInRequest): DeviceProof | undefined {
    return request.device === undefined
      ? undefined
      : {
          action: IdentityRoute.SignIn,
          signature: request.device,
          bound: [request.email],
        };
  }

  private static refOf(user: UserSnapshot): UserRef {
    return { userId: user.id, homeTenantId: user.homeTenantId };
  }
}
