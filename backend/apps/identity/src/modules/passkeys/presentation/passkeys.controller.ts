import { Endpoint, Resource } from '@platform/http/nest';
import {
  PasskeySignInOptionsRoute,
  PasskeySignInVerifyRoute,
  PasskeyMfaOptionsRoute,
  PasskeyMfaVerifyRoute,
  PasskeyStepUpOptionsRoute,
  PasskeyStepUpVerifyRoute,
  ListPasskeysRoute,
  PasskeyRegistrationOptionsRoute,
  RegisterPasskeyRoute,
  RemovePasskeyRoute,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

@Resource(IdentityResource.Passkeys)
export class PasskeysController {
  @Endpoint(PasskeySignInOptionsRoute)
  passkeySignInOptions(): never {
    throw new RouteNotImplementedError(PasskeySignInOptionsRoute.id);
  }

  @Endpoint(PasskeySignInVerifyRoute)
  passkeySignInVerify(): never {
    throw new RouteNotImplementedError(PasskeySignInVerifyRoute.id);
  }

  @Endpoint(PasskeyMfaOptionsRoute)
  passkeyMfaOptions(): never {
    throw new RouteNotImplementedError(PasskeyMfaOptionsRoute.id);
  }

  @Endpoint(PasskeyMfaVerifyRoute)
  passkeyMfaVerify(): never {
    throw new RouteNotImplementedError(PasskeyMfaVerifyRoute.id);
  }

  @Endpoint(PasskeyStepUpOptionsRoute)
  passkeyStepUpOptions(): never {
    throw new RouteNotImplementedError(PasskeyStepUpOptionsRoute.id);
  }

  @Endpoint(PasskeyStepUpVerifyRoute)
  passkeyStepUpVerify(): never {
    throw new RouteNotImplementedError(PasskeyStepUpVerifyRoute.id);
  }

  @Endpoint(ListPasskeysRoute)
  listPasskeys(): never {
    throw new RouteNotImplementedError(ListPasskeysRoute.id);
  }

  @Endpoint(PasskeyRegistrationOptionsRoute)
  passkeyRegistrationOptions(): never {
    throw new RouteNotImplementedError(PasskeyRegistrationOptionsRoute.id);
  }

  @Endpoint(RegisterPasskeyRoute)
  registerPasskey(): never {
    throw new RouteNotImplementedError(RegisterPasskeyRoute.id);
  }

  @Endpoint(RemovePasskeyRoute)
  removePasskey(): never {
    throw new RouteNotImplementedError(RemovePasskeyRoute.id);
  }
}
