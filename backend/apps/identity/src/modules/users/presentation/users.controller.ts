import { ActingUser } from '@platform/auth';
import { RateLimitTier } from '@platform/http';
import { Endpoint, CurrentActor, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
import {
  SignUpRoute,
  ResendEmailVerificationRoute,
  ConfirmEmailVerificationRoute,
  GetProfileRoute,
  UpdateProfileRoute,
  RequestEmailChangeRoute,
  ConfirmEmailChangeRoute,
  StartAccountDeletionRoute,
  type EmailChangeConfirmRequest,
  type EmailChangeRequest,
  type EmailVerificationConfirmRequest,
  type EmailVerificationRequest,
  type SignUpRequest,
  type UpdateProfileRequest,
  type UserProfile,
  type AccountDeletionStarted,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { ConfirmEmailChange } from '../application/confirm-email-change.use-case.js';
import { ConfirmEmailVerification } from '../application/confirm-email-verification.use-case.js';
import { RegisterUser } from '../application/register-user.use-case.js';
import { RequestEmailChange } from '../application/request-email-change.use-case.js';
import { ResendEmailVerification } from '../application/resend-email-verification.use-case.js';
import { StartAccountDeletion } from '../application/start-account-deletion.use-case.js';
import { UpdateMyProfile } from '../application/update-my-profile.use-case.js';
import { UserProfileView } from '../application/user-profile-view.js';
import { UserReader } from '../application/user-reader.js';

/** HTTP edge of accounts: sign-up, email verification, profile, email change and account deletion. */
@Resource(IdentityResource.Users)
export class UsersController {
  constructor(
    private readonly register: RegisterUser,
    private readonly resend: ResendEmailVerification,
    private readonly confirm: ConfirmEmailVerification,
    private readonly reader: UserReader,
    private readonly update: UpdateMyProfile,
    private readonly requestChange: RequestEmailChange,
    private readonly confirmChange: ConfirmEmailChange,
    private readonly accountDeletion: StartAccountDeletion,
  ) {}

  /**
   * Signs up a person; the answer is the same whether the email is taken or not.
   * @param input Email, password, name, locale and an optional invitation.
   */
  @Endpoint(SignUpRoute)
  async signUp(@Input() input: SignUpRequest): Promise<void> {
    await this.register.execute(input);
  }

  /**
   * Resends the verification email to a pending account.
   * @param input Email.
   */
  @Endpoint(ResendEmailVerificationRoute)
  async resendEmailVerification(
    @Input() input: EmailVerificationRequest,
  ): Promise<void> {
    await this.resend.execute(input.email);
  }

  /**
   * Confirms the email with the emailed token.
   * @param input Emailed token.
   */
  @Endpoint(ConfirmEmailVerificationRoute)
  async confirmEmailVerification(
    @Input() input: EmailVerificationConfirmRequest,
  ): Promise<void> {
    await this.confirm.execute(input.token);
  }

  /**
   * Reads the caller's profile.
   * @param actor Caller.
   * @returns The profile.
   */
  @Endpoint(GetProfileRoute)
  async getProfile(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<UserProfile> {
    const user = ActingUser.of(actor);
    return UserProfileView.of(
      await this.reader.getByRef(ActingUser.refOf(user)),
    );
  }

  /**
   * Updates the caller's profile.
   * @param input Fields to change.
   * @param actor Caller.
   * @returns The profile.
   */
  @Endpoint(UpdateProfileRoute)
  updateProfile(
    @Input() input: UpdateProfileRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<UserProfile> {
    return this.update.execute(ActingUser.refOf(ActingUser.of(actor)), input);
  }

  /**
   * Sends a confirmation to the new email of the caller.
   * @param input New email.
   * @param actor Caller.
   */
  @Endpoint(RequestEmailChangeRoute, { rateLimit: RateLimitTier.Sensitive })
  async requestEmailChange(
    @Input() input: EmailChangeRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.requestChange.execute(
      ActingUser.refOf(ActingUser.of(actor)),
      input.newEmail,
    );
  }

  /**
   * Confirms the email change with the emailed token.
   * @param input Emailed token.
   * @param actor Caller.
   */
  @Endpoint(ConfirmEmailChangeRoute, { rateLimit: RateLimitTier.Sensitive })
  async confirmEmailChange(
    @Input() input: EmailChangeConfirmRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.confirmChange.execute(
      ActingUser.refOf(ActingUser.of(actor)),
      input.token,
    );
  }

  /**
   * Starts the deletion of the caller's account.
   * @param actor Caller.
   * @returns The saga that deletes it.
   */
  @Endpoint(StartAccountDeletionRoute)
  startAccountDeletion(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<AccountDeletionStarted> {
    return this.accountDeletion.execute(ActingUser.refOf(ActingUser.of(actor)));
  }
}
