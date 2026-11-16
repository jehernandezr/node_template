import { Endpoint, Resource } from '@platform/http/nest';
import {
  RequestMfaChallengeRoute,
  VerifyMfaRoute,
  StartStepUpRoute,
  RequestStepUpChallengeRoute,
  VerifyStepUpRoute,
  StartTotpEnrollmentRoute,
  ConfirmTotpEnrollmentRoute,
  RemoveTotpRoute,
  RegenerateRecoveryCodesRoute,
  StartMfaRecoveryRoute,
  ConfirmMfaRecoveryRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Mfa)
export class MfaController {
  @Endpoint(RequestMfaChallengeRoute)
  requestMfaChallenge(): never {
    throw new RouteNotImplementedError(RequestMfaChallengeRoute.id);
  }

  @Endpoint(VerifyMfaRoute)
  verifyMfa(): never {
    throw new RouteNotImplementedError(VerifyMfaRoute.id);
  }

  @Endpoint(StartStepUpRoute)
  startStepUp(): never {
    throw new RouteNotImplementedError(StartStepUpRoute.id);
  }

  @Endpoint(RequestStepUpChallengeRoute)
  requestStepUpChallenge(): never {
    throw new RouteNotImplementedError(RequestStepUpChallengeRoute.id);
  }

  @Endpoint(VerifyStepUpRoute)
  verifyStepUp(): never {
    throw new RouteNotImplementedError(VerifyStepUpRoute.id);
  }

  @Endpoint(StartTotpEnrollmentRoute)
  startTotpEnrollment(): never {
    throw new RouteNotImplementedError(StartTotpEnrollmentRoute.id);
  }

  @Endpoint(ConfirmTotpEnrollmentRoute)
  confirmTotpEnrollment(): never {
    throw new RouteNotImplementedError(ConfirmTotpEnrollmentRoute.id);
  }

  @Endpoint(RemoveTotpRoute)
  removeTotp(): never {
    throw new RouteNotImplementedError(RemoveTotpRoute.id);
  }

  @Endpoint(RegenerateRecoveryCodesRoute)
  regenerateRecoveryCodes(): never {
    throw new RouteNotImplementedError(RegenerateRecoveryCodesRoute.id);
  }

  @Endpoint(StartMfaRecoveryRoute)
  startMfaRecovery(): never {
    throw new RouteNotImplementedError(StartMfaRecoveryRoute.id);
  }

  @Endpoint(ConfirmMfaRecoveryRoute)
  confirmMfaRecovery(): never {
    throw new RouteNotImplementedError(ConfirmMfaRecoveryRoute.id);
  }
}
