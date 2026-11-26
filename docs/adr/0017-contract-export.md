# 0017. Exporting contracts to JSON and generating the Dart

- Status: Accepted
- Date: 2026-11-12
- Revision: 2026-11-14 (`@Operation` and `OperationContract` were retired; OpenAPI comes from `contract.json` in F11, without `@nestjs/swagger`, per decision 4 of the F4 design)
- Revision: 2026-11-14 (moves to Accepted: the export, `contracts_gen` and their checks are implemented and run in the `contracts` CI job)

## Context

ADR 0015 establishes that contracts are written in TypeScript with zod in `backend/libs/contracts` and that the front receives them generated. This ADR decides the intermediate format, what is generated in Dart, how the client validates before calling over HTTP and how CI detects that someone changed one side without regenerating the other.

In addition, the November 12 audit found that the access enums only existed in Dart and that the catalog's `messageKey` (`errors.platform.x.y`) did not match the front's ARB keys (`error_platform_x_y`).

## Decision

### Contract kit in `@contracts/platform`

`backend/libs/contracts/platform/src` has the folders `enums`, `constants`, `types`, `schemas`, `errors` and `kit`:

- `defineRoute`: method, path with parameters in braces, request schema (always an object), response schema or `null` (204), declared error codes and access requirement (`Access.public()` or `Access.authenticated({ permissions, platformRoles, mfaMaxAgeMinutes })`). Fields that are not in the path travel in the query for GET and DELETE, and in the JSON body for the other methods.
- `defineOperation`: internal operation with `id`, `input`, `output`, `idempotent`, `mutating`, `compensatedBy` or `Compensation.None` with a mandatory `compensationReason`, `errors`, `timeoutMs`, `retry` and `description`. The `id` carries the version at the end (`service.entity.operation.vN`, for example `identity.sessions.revoke-for-user.v1`) and the descriptor exposes it in `version`: the id is stored in the saga log and in idempotency keys, and an incompatible change creates a `.vN+1` id that coexists with the previous one. It returns a frozen descriptor that `@platform/internal-api` and `@platform/saga` accept directly: `ContractRegistry.register`, `InternalClient.call`, `InternalRouter.register` and `SagaFlow.step` take the descriptor without classes or decorators. The saga takes the compensation from its `compensatedBy` (ADR 0008). The `@Operation` decorator and the `OperationContract` class were retired (revision above).
- `defineEvent`: CloudEvents type with the version at the end (`identity.session.revoked.v1`) and payload schema.
- `defineErrorCatalog`: one entry per value of the code enum, with `httpStatus`, `retryable`, `audience` (`public` or `internal`) and `messageKey`. `messageKey` is derived from the code with the same rule as the front: `PLATFORM.AUTH.FORBIDDEN` → `error_platform_auth_forbidden`.
- `defineServiceContract`: gathers a service's enums, constants, named schemas, routes, operations, events and catalogs, and validates unique names and identifiers.
- `validateContract` and `fieldErrorsFromZod`: translate zod issues into `FieldError` with `PLATFORM.VALIDATION.*` codes (`REQUIRED`, `INVALID_TYPE`, `INVALID_FORMAT`, `INVALID_ENUM`, `TOO_SHORT`, `TOO_LONG`, `TOO_SMALL`, `TOO_LARGE`, `UNKNOWN_FIELD`) and dotted field paths (`items.0.name`).

Cross-cutting schemas: `Id` (UUIDv7), `Timestamp` (ISO 8601 in UTC), `Cursor` and `PageLimit` bounded by `Pagination`, `PageQuery`, `pageOf(item)`, `CurrencyCode`, `MoneyAmount` (integer in minor units), `FieldError`, `ProblemDetails` and `Empty`.

The central catalog only holds the public and cross-cutting codes of `PlatformErrorCode`. Each library in `backend/libs/platform` declares its internal codes and its catalog in its own enum; the service composes the central catalog with those of the libraries it uses, and `ErrorCatalog.register` accepts a repeated entry only if it defines the same thing. A `platform-smoke` test requires that no code that existed before the cleanup is lost.

### Contracts per service

Each service has `backend/libs/contracts/<service>` with the folders `enums`, `constants`, `types`, `schemas`, `http`, `internal`, `events` and `errors`, and a `contract.ts` that exports its `ServiceContract`. The projects carry the tags `type:contracts` and `scope:<service>`. Types are interfaces in `types/` and each schema is declared with `satisfies z.ZodType<Type>`, so `types` does not import `schemas`.

The first one is `@contracts/identity`: access enums (`Permission`, `PlatformRole`, `PlanFeature`, `FeatureFlag`) with the same values the Dart had, routes for sign-in, MFA verification, sessions and devices, two internal operations and two events.

### Export to JSON

`backend/tools/contracts-export` (Nx project `contracts-export`, tag `type:tool`) has two targets:

- `export` writes `backend/libs/contracts/<service>/export/contract.json`.
- `check` fails if the committed JSON differs from what the TypeScript produces, or if there is a folder in `libs/contracts` without a contract registered in `src/registry.ts`.

Each `contract.json` has `formatVersion`, `jsonSchemaDialect` (2020-12), `enums`, `constants`, `schemas` (JSON Schema from `z.toJSONSchema` in `input` mode), `routes`, `operations`, `events` and `errors`. References between schemas are `#/schemas/Name` within the service and `../../<service>/export/contract.json#/schemas/Name` between services. The file is formatted with Prettier so that `nx format:check` does not flag it.

### Dart generation

`front/tools/contracts_gen` (pub workspace package, executable `contracts_gen`) reads every `contract.json` and writes `front/packages/contracts/lib/src/<service>/{enums,constants,types,schemas,http}/` with the header `// GENERATED, do not edit.`. With `--check` it exits with code 1 if any file changes or is left over.

- Enums: `wireCode` and `tryParse`. Enums with a catalog (`PlatformErrorCode`, `IdentityErrorCode`) only include the public codes and carry `code`, `httpStatus`, `retryable`, `messageKey` and `fromCode`.
- Constants: `abstract final` classes with `static const`.
- Types: immutable classes with `fromJson`, `toJson`, value equality and a static `encode`. An unknown enum value inside a list is ignored; in a required field it throws `FormatException`.
- Schemas: `<Type>Schema.validate(json)` returns `List<FieldError>` with the same codes and paths as `fieldErrorsFromZod`, plus the `<Type>.validate()` extension.
- HTTP: `<Service>Routes` with a constant `RouteDescriptor` per route.

`lib/src/core/` is still handwritten: `ProblemDetails`, `FieldError`, `ApiErrorException`, `ContractViolationException`, `RouteDescriptor` and the helpers of the generated code. The generator does not emit classes for `ProblemDetails` and `FieldError`, but it does emit their validators.

### Validate before calling

`front/packages/api` exposes `ApiClient` with an injectable `HttpTransport` port. Before sending, it validates the request with the generated validator; if it fails, it throws `ContractViolationException` and does not call the transport. Error responses are read as `ProblemDetails` and thrown as `ApiErrorException`; successful ones are validated and decoded with the generated type.

In the backend, `InternalClient` validates the input of an internal operation with the same schema before calling. If it fails, it returns, without calling the transport, the same result `InternalRouter` would give: `BusinessError` with `PLATFORM.VALIDATION.INVALID_INPUT` and `details.fieldErrors`. The caller handles the case in a single way.

### CI

The `contracts` job in `.github/workflows/ci.yml` runs when something changes that alters the exported JSON, the topology, AsyncAPI or the generated Dart: `backend/libs/contracts`, `backend/libs/platform/messaging`, `backend/tools/contracts-export`, `backend/infra/terraform/topology.json`, `pnpm-lock.yaml`, `.prettierrc`, `front/packages/contracts`, the generated error messages in `front/packages/i18n`, `front/pubspec.lock`, `front/tools` or the workflow itself. It runs two commands:

- `pnpm nx run contracts-export:check` from the root, which also compares `topology.json` and `asyncapi.json`.
- `flutter pub get` and `dart run contracts_gen --check` inside `front/`.

A change to a contract requires committing the exported JSON and the generated Dart in the same change.

### Pipeline status

Today the `platform` and `identity` contracts exist, each with its `export/contract.json`, and the generated Dart in `front/packages/contracts/lib/src/{platform,identity}`. Both CI commands pass locally on the integration branch: the export matches the TypeScript and the Dart is up to date.

The next step is to see the `contracts` job green in GitHub Actions when this branch is merged into `main`. With that run, the status of this ADR moves to `Accepted`.

## Consequences

### Positive

- A single source of truth: access enums, error codes and routes are written once in TypeScript.
- The client rejects an invalid request without calling the network and shows the same error the server would give.
- `messageKey` is the ARB key, and a front test requires a Spanish and English message for every public code.
- The intermediate JSON serves other tools (documentation, AsyncAPI, topology) without reading TypeScript.

### Costs

- The generator supports a subset of JSON Schema: objects, arrays, strings with length, pattern and format (`uuid`, `email`, `date-time`), numbers with bounds, enums, `const` and `X | null`. A schema with `oneOf`, `allOf` or `additionalProperties` as a schema fails to generate and has to be modeled another way.
- zod patterns are used as is in Dart `RegExp`; a pattern that depends on a JavaScript flag would have to be declared explicitly.
- Type names are global in Dart: two services cannot export the same name, and a contract name must not clash with microfrontend classes (that is why the amount is called `MoneyAmount`).
- Each new service is registered by hand in `backend/tools/contracts-export/src/registry.ts`; `check` reminds you.

## Alternatives considered

- OpenAPI with an existing Dart generator: it does not cover internal operations, events or error catalogs, and the generated validators do not produce the same `FieldError` as the server.
- Writing the contracts by hand in Dart and in TypeScript with a sync test: that is what existed, and the audit showed it drifts.
