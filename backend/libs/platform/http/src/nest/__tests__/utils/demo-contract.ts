import { z } from 'zod';
import {
  Access,
  HttpMethod,
  defineErrorCatalog,
  defineRoute,
  defineServiceContract,
  ErrorSpecs,
} from '@contracts/platform';
import { Permission } from '@contracts/identity';
import { DemoErrorCode } from './demo-error-code.enum.js';

export const demoErrorCatalog = defineErrorCatalog(DemoErrorCode, {
  [DemoErrorCode.ItemConflict]: ErrorSpecs.pub(
    409,
    false,
    'El elemento ya existe.',
  ),
});

const SessionSchema = z.strictObject({
  sessionToken: z.string().optional(),
  accessToken: z.string(),
});

export const CreateItemRoute = defineRoute({
  id: 'demo.items.create',
  method: HttpMethod.Post,
  path: '/v1/items',
  request: z.strictObject({ name: z.string().min(1) }),
  response: z.strictObject({ id: z.string(), name: z.string() }),
  successStatus: 201,
  access: Access.public(),
  description: 'Crea un elemento.',
});

export const ListItemsRoute = defineRoute({
  id: 'demo.items.list',
  method: HttpMethod.Get,
  path: '/v1/items',
  request: z.strictObject({ limit: z.number().int() }),
  response: z.strictObject({ limit: z.number().int() }),
  access: Access.public(),
  description: 'Lista elementos.',
});

export const GetMeRoute = defineRoute({
  id: 'demo.me.get',
  method: HttpMethod.Get,
  path: '/v1/me',
  response: z.strictObject({
    userId: z.string().optional(),
    tenantId: z.string().optional(),
  }),
  access: Access.authenticated(),
  description: 'Devuelve el usuario autenticado.',
});

export const ReadSecretRoute = defineRoute({
  id: 'demo.secret.read',
  method: HttpMethod.Get,
  path: '/v1/secret',
  response: z.strictObject({ ok: z.literal(true) }),
  access: Access.authenticated({ permissions: [Permission.TasksRead] }),
  description: 'Lee un secreto que exige un permiso.',
});

export const DangerousRoute = defineRoute({
  id: 'demo.dangerous.run',
  method: HttpMethod.Post,
  path: '/v1/dangerous',
  successStatus: 204,
  access: Access.authenticated({ mfaMaxAgeMinutes: 5 }),
  description: 'Operación sensible que exige MFA reciente.',
});

export const IssueSessionRoute = defineRoute({
  id: 'demo.auth.session-issue',
  method: HttpMethod.Post,
  path: '/v1/auth/session',
  response: SessionSchema,
  successStatus: 201,
  access: Access.public(),
  description: 'Inicia una sesión.',
});

export const RotateSessionRoute = defineRoute({
  id: 'demo.auth.session-rotate',
  method: HttpMethod.Post,
  path: '/v1/auth/session/refresh',
  request: z.strictObject({ sessionToken: z.string().optional() }),
  response: SessionSchema,
  access: Access.public(),
  description: 'Renueva una sesión.',
});

export const ClearSessionRoute = defineRoute({
  id: 'demo.auth.session-clear',
  method: HttpMethod.Post,
  path: '/v1/auth/session/sign-out',
  request: z.strictObject({ sessionToken: z.string().optional() }),
  successStatus: 204,
  access: Access.public(),
  description: 'Cierra la sesión.',
});

export const OldItemsRoute = defineRoute({
  id: 'demo.old-items.list',
  method: HttpMethod.Get,
  path: '/v1/old-items',
  response: z.strictObject({ ok: z.literal(true) }),
  access: Access.public(),
  deprecated: {
    since: '2026-01-01',
    sunset: '2099-01-01',
    replacement: 'demo.items.list',
  },
  description: 'Ruta deprecada con reemplazo.',
});

export const GoneItemsRoute = defineRoute({
  id: 'demo.gone-items.list',
  method: HttpMethod.Get,
  path: '/v1/gone-items',
  response: z.strictObject({ ok: z.literal(true) }),
  access: Access.public(),
  deprecated: { since: '2020-01-01', sunset: '2021-01-01' },
  description: 'Ruta ya retirada.',
});

export const ConflictRoute = defineRoute({
  id: 'demo.conflicts.create',
  method: HttpMethod.Post,
  path: '/v1/conflicts',
  errors: [DemoErrorCode.ItemConflict],
  access: Access.public(),
  description: 'Responde un conflicto de negocio.',
});

export const BoomRoute = defineRoute({
  id: 'demo.boom.run',
  method: HttpMethod.Get,
  path: '/v1/boom',
  access: Access.public(),
  description: 'Falla con un error común.',
});

export const BadOutputRoute = defineRoute({
  id: 'demo.bad-output.get',
  method: HttpMethod.Get,
  path: '/v1/bad-output',
  response: z.strictObject({ ok: z.boolean() }),
  access: Access.public(),
  description: 'Devuelve una respuesta que no cumple su esquema.',
});

export const SlowRoute = defineRoute({
  id: 'demo.slow.get',
  method: HttpMethod.Get,
  path: '/v1/slow',
  access: Access.public(),
  description: 'Tarda más que su tope de tiempo.',
});

export const LimitedRoute = defineRoute({
  id: 'demo.auth.limited',
  method: HttpMethod.Post,
  path: '/v1/auth/limited',
  successStatus: 204,
  access: Access.public(),
  description: 'Ruta de credenciales con el límite por defecto.',
});

export const ApiKeyItemsRoute = defineRoute({
  id: 'demo.api-key-items.list',
  method: HttpMethod.Get,
  path: '/v1/api-key-items',
  response: z.strictObject({ ok: z.literal(true) }),
  access: Access.authenticated(),
  description: 'Lista elementos con JWT o API key.',
});

export const demoContract = defineServiceContract({
  service: 'demo',
  description: 'Contrato de prueba de la entrada HTTP.',
  enums: { DemoErrorCode },
  errors: { DemoErrorCode: demoErrorCatalog },
  routes: {
    createItem: CreateItemRoute,
    listItems: ListItemsRoute,
    getMe: GetMeRoute,
    readSecret: ReadSecretRoute,
    dangerous: DangerousRoute,
    issueSession: IssueSessionRoute,
    rotateSession: RotateSessionRoute,
    clearSession: ClearSessionRoute,
    oldItems: OldItemsRoute,
    goneItems: GoneItemsRoute,
    conflict: ConflictRoute,
    boom: BoomRoute,
    badOutput: BadOutputRoute,
    slow: SlowRoute,
    limited: LimitedRoute,
    apiKeyItems: ApiKeyItemsRoute,
  },
});
