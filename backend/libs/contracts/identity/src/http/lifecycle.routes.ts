import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { MfaRules } from '../constants/identity.constants.js';
import { IdentityErrorCode, IdentityRoute } from '../enums/identifiers.enum.js';
import {
  AccountDeletionStartedSchema,
  GetSagaRequestSchema,
  SagaSummarySchema,
} from '../schemas/orchestration.schema.js';
import { SessionGuardErrors } from './session-guard.errors.js';

/**
 * `POST /v1/me/deletion`: starts the deletion of the account. Requires a recent MFA, and the last owner of a
 * tenant with other members hands over ownership first.
 */
export const StartAccountDeletionRoute = defineRoute({
  id: IdentityRoute.StartAccountDeletion,
  method: HttpMethod.Post,
  path: '/v1/me/deletion',
  response: AccountDeletionStartedSchema,
  successStatus: 202,
  errors: [
    ...SessionGuardErrors,
    IdentityErrorCode.MfaStepUpRequired,
    IdentityErrorCode.AccessLastOwner,
  ],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description:
    'Starts the deletion of the account of the authenticated user, unless they are the last owner of a tenant with other members. The saga is read with its id.',
});

/** `GET /v1/sagas/{sagaId}`: status of a saga started by the user or their tenant. */
export const GetSagaRoute = defineRoute({
  id: IdentityRoute.GetSaga,
  method: HttpMethod.Get,
  path: '/v1/sagas/{sagaId}',
  request: GetSagaRequestSchema,
  response: SagaSummarySchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Returns the status of an own saga or one of the tenant.',
});
