import { ActingUser } from '@platform/auth';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import {
  GetSagaRoute,
  type GetSagaRequest,
  type SagaSummary,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { IdentitySagas } from '../application/identity-sagas.js';

@Resource(IdentityResource.Sagas)
export class SagasController {
  constructor(private readonly sagas: IdentitySagas) {}

  @Endpoint(GetSagaRoute)
  get(
    @Input() input: GetSagaRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<SagaSummary> {
    return this.sagas.summary(input.sagaId, ActingUser.of(actor).userId);
  }
}
