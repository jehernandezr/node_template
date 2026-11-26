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

/** HTTP route of the state of a saga the user requested. */
@Resource(IdentityResource.Sagas)
export class SagasController {
  constructor(private readonly sagas: IdentitySagas) {}

  /**
   * Reads the state of a saga.
   * @param input Saga id.
   * @param actor Signed-in user, who must have requested it.
   * @returns The saga summary.
   */
  @Endpoint(GetSagaRoute)
  get(
    @Input() input: GetSagaRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<SagaSummary> {
    return this.sagas.summary(input.sagaId, ActingUser.of(actor).userId);
  }
}
