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
 * `POST /v1/me/deletion`: inicia la saga `DeleteAccount`. Exige MFA reciente
 * porque el borrado no se puede deshacer.
 */
export const StartAccountDeletionRoute = defineRoute({
  id: IdentityRoute.StartAccountDeletion,
  method: HttpMethod.Post,
  path: '/v1/me/deletion',
  response: AccountDeletionStartedSchema,
  successStatus: 202,
  errors: [...SessionGuardErrors, IdentityErrorCode.MfaStepUpRequired],
  access: Access.authenticated({
    mfaMaxAgeMinutes: MfaRules.stepUpMaxAgeMinutes,
  }),
  description:
    'Inicia el borrado de la cuenta del usuario autenticado. La saga se consulta con su id.',
});

/** `GET /v1/sagas/{sagaId}`: estado de una saga que inició el usuario o su tenant. */
export const GetSagaRoute = defineRoute({
  id: IdentityRoute.GetSaga,
  method: HttpMethod.Get,
  path: '/v1/sagas/{sagaId}',
  request: GetSagaRequestSchema,
  response: SagaSummarySchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ResourceNotFound],
  access: Access.authenticated(),
  description: 'Devuelve el estado de una saga propia o de su tenant.',
});
