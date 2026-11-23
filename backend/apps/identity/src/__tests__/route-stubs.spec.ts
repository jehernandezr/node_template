import { identityContract } from '@contracts/identity';
import {
  HttpMetadataKey,
  type EndpointMetadata,
  type ResourceMetadata,
} from '@platform/http/nest';
import { AccessController } from '../modules/access/presentation/access.controller.js';
import { ApiKeysController } from '../modules/api-keys/presentation/api-keys.controller.js';
import { AuthenticationController } from '../modules/authentication/presentation/authentication.controller.js';
import { DevicesController } from '../modules/devices/presentation/devices.controller.js';
import { InvitationsController } from '../modules/invitations/presentation/invitations.controller.js';
import { MfaController } from '../modules/mfa/presentation/mfa.controller.js';
import { PasskeysController } from '../modules/passkeys/presentation/passkeys.controller.js';
import { PasswordsController } from '../modules/passwords/presentation/passwords.controller.js';
import { SagasController } from '../modules/sagas/presentation/sagas.controller.js';
import { SessionsController } from '../modules/sessions/presentation/sessions.controller.js';
import { TenantsController } from '../modules/tenants/presentation/tenants.controller.js';
import { TokensController } from '../modules/tokens/presentation/tokens.controller.js';
import { UsersController } from '../modules/users/presentation/users.controller.js';

type ControllerClass = abstract new (...args: never[]) => object;

const CONTROLLERS: readonly ControllerClass[] = [
  UsersController,
  PasswordsController,
  AuthenticationController,
  DevicesController,
  MfaController,
  PasskeysController,
  SessionsController,
  TokensController,
  TenantsController,
  AccessController,
  InvitationsController,
  ApiKeysController,
  SagasController,
];

interface StubEndpoint {
  readonly controller: ControllerClass;
  readonly method: string;
  readonly routeId: string;
}

/** Cada método de un controller con `@Endpoint`, con el id de su ruta del contrato. */
function endpointsOf(controller: ControllerClass): StubEndpoint[] {
  const prototype: Record<string, unknown> = controller.prototype as Record<
    string,
    unknown
  >;
  return Object.getOwnPropertyNames(prototype)
    .filter((method) => method !== 'constructor')
    .flatMap((method) => {
      const metadata = Reflect.getMetadata(
        HttpMetadataKey.Endpoint,
        prototype[method] as object,
      ) as EndpointMetadata | undefined;
      return metadata === undefined
        ? []
        : [{ controller, method, routeId: metadata.route.id }];
    });
}

describe('identity routes', () => {
  const endpoints = CONTROLLERS.flatMap(endpointsOf);

  it('covers every route of the identity contract exactly once', () => {
    const declared = endpoints.map((endpoint) => endpoint.routeId);
    const contractIds = Object.values(identityContract.routes).map(
      (route) => route.id,
    );

    expect(new Set(declared).size).toBe(declared.length);
    expect([...declared].sort()).toEqual([...contractIds].sort());
  });

  it.each(CONTROLLERS.map((controller) => [controller.name, controller]))(
    '%s declares its resource name',
    (_, controller) => {
      const metadata = Reflect.getMetadata(
        HttpMetadataKey.Resource,
        controller,
      ) as ResourceMetadata | undefined;

      expect(metadata?.name).toEqual(expect.any(String));
    },
  );

  it('gives every controller a different resource name', () => {
    const names = CONTROLLERS.map(
      (controller) =>
        (
          Reflect.getMetadata(
            HttpMetadataKey.Resource,
            controller,
          ) as ResourceMetadata
        ).name,
    );

    expect(new Set(names).size).toBe(CONTROLLERS.length);
  });
});
