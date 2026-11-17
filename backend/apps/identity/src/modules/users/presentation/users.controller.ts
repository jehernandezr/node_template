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
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';
import {
  requireUserActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { ConfirmEmailChange } from '../application/confirm-email-change.use-case.js';
import { ConfirmEmailVerification } from '../application/confirm-email-verification.use-case.js';
import { RegisterUser } from '../application/register-user.use-case.js';
import { RequestEmailChange } from '../application/request-email-change.use-case.js';
import { ResendEmailVerification } from '../application/resend-email-verification.use-case.js';
import { UpdateMyProfile } from '../application/update-my-profile.use-case.js';
import { UserProfileView } from '../application/user-profile-view.js';
import { UserReader } from '../application/user-reader.js';

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
  ) {}

  @Endpoint(SignUpRoute)
  async signUp(@Input() input: SignUpRequest): Promise<void> {
    await this.register.execute(input);
  }

  @Endpoint(ResendEmailVerificationRoute)
  async resendEmailVerification(
    @Input() input: EmailVerificationRequest,
  ): Promise<void> {
    await this.resend.execute(input.email);
  }

  @Endpoint(ConfirmEmailVerificationRoute)
  async confirmEmailVerification(
    @Input() input: EmailVerificationConfirmRequest,
  ): Promise<void> {
    await this.confirm.execute(input.token);
  }

  @Endpoint(GetProfileRoute)
  async getProfile(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<UserProfile> {
    const user = requireUserActor(actor);
    return UserProfileView.of(await this.reader.getByRef(userRefOf(user)));
  }

  @Endpoint(UpdateProfileRoute)
  updateProfile(
    @Input() input: UpdateProfileRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<UserProfile> {
    return this.update.execute(userRefOf(requireUserActor(actor)), input);
  }

  @Endpoint(RequestEmailChangeRoute)
  async requestEmailChange(
    @Input() input: EmailChangeRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.requestChange.execute(
      userRefOf(requireUserActor(actor)),
      input.newEmail,
    );
  }

  @Endpoint(ConfirmEmailChangeRoute)
  async confirmEmailChange(
    @Input() input: EmailChangeConfirmRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.confirmChange.execute(
      userRefOf(requireUserActor(actor)),
      input.token,
    );
  }

  /** El borrado de cuenta es la saga `DeleteAccount`, que llega con su ciclo. */
  @Endpoint(StartAccountDeletionRoute)
  startAccountDeletion(): never {
    throw new RouteNotImplementedError(StartAccountDeletionRoute.id);
  }
}
