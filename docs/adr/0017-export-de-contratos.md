# 0017. Export de contratos a JSON y generación del Dart

- Estado: Propuesta
- Fecha: 2026-11-12

## Contexto

El ADR 0015 fija que los contratos se escriben en TypeScript con zod en `backend/libs/contracts` y que el front los recibe generados. Faltaba decidir el formato intermedio, qué se genera en Dart, cómo valida el cliente antes de llamar por HTTP y cómo detecta CI que alguien cambió un lado sin regenerar el otro.

Además, la auditoría del 12 de noviembre encontró que los enums de acceso solo existían en Dart y que `messageKey` del catálogo (`errors.platform.x.y`) no coincidía con las llaves ARB del front (`error_platform_x_y`).

## Decisión

### Kit de contratos en `@contracts/platform`

`backend/libs/contracts/platform/src` tiene las carpetas `enums`, `constants`, `types`, `schemas`, `errors` y `kit`:

- `defineRoute`: método, path con parámetros entre llaves, esquema de petición (siempre un objeto), esquema de respuesta o `null` (204), códigos de error declarados y requisito de acceso (`Access.public()` o `Access.authenticated({ permissions, platformRoles, mfaMaxAgeMinutes })`). Los campos que no van en el path viajan en la query en GET y DELETE, y en el cuerpo JSON en los demás métodos.
- `defineOperation`: operación interna con `id`, `input`, `output`, `idempotent`, `mutating`, `compensatedBy` o `Compensation.None` con `compensationReason` obligatorio, `errors`, `timeoutMs` y `retry`. Los campos coinciden con `OperationOptions` de `@platform/internal-api`, así la definición se pasa tal cual a `@Operation`.
- `defineEvent`: tipo CloudEvents con la versión al final (`identity.session.revoked.v1`) y esquema del payload.
- `defineErrorCatalog`: una entrada por valor del enum de códigos, con `httpStatus`, `retryable`, `audience` (`public` o `internal`) y `messageKey`. `messageKey` se deriva del código con la misma regla del front: `PLATFORM.AUTH.FORBIDDEN` → `error_platform_auth_forbidden`.
- `defineServiceContract`: reúne enums, constantes, esquemas con nombre, rutas, operaciones, eventos y catálogos de un servicio, y valida nombres e identificadores únicos.
- `validateContract` y `fieldErrorsFromZod`: traducen los issues de zod a `FieldError` con códigos `PLATFORM.VALIDATION.*` (`REQUIRED`, `INVALID_TYPE`, `INVALID_FORMAT`, `INVALID_ENUM`, `TOO_SHORT`, `TOO_LONG`, `TOO_SMALL`, `TOO_LARGE`, `UNKNOWN_FIELD`) y rutas de campo con punto (`items.0.name`).

Esquemas transversales: `Id` (UUIDv7), `Timestamp` (ISO 8601 en UTC), `Cursor` y `PageLimit` acotados por `Pagination`, `PageQuery`, `pageOf(item)`, `CurrencyCode`, `MoneyAmount` (entero en unidades menores), `FieldError`, `ProblemDetails` y `Empty`.

El catálogo de plataforma cubre todo código `PLATFORM.*` declarado en `backend/libs/platform`; una prueba falla si aparece uno nuevo sin entrada.

### Contratos por servicio

Cada servicio tiene `backend/libs/contracts/<servicio>` con las carpetas `enums`, `constants`, `types`, `schemas`, `http`, `internal`, `events` y `errors`, y un `contract.ts` que exporta su `ServiceContract`. Los proyectos llevan los tags `type:contracts` y `scope:<servicio>`. Los tipos son interfaces en `types/` y cada esquema se declara con `satisfies z.ZodType<Tipo>`, así `types` no importa `schemas`.

El primero es `@contracts/identity`: enums de acceso (`Permission`, `PlatformRole`, `PlanFeature`, `FeatureFlag`) con los mismos valores que tenía el Dart, rutas de inicio de sesión, verificación MFA, sesiones y dispositivos, dos operaciones internas y dos eventos.

### Export a JSON

`backend/tools/contracts-export` (proyecto Nx `contracts-export`, tag `type:tool`) tiene dos targets:

- `export` escribe `backend/libs/contracts/<servicio>/export/contract.json`.
- `check` falla si el JSON confirmado difiere del que produce el TypeScript, o si hay una carpeta en `libs/contracts` sin contrato registrado en `src/registry.ts`.

Cada `contract.json` tiene `formatVersion`, `jsonSchemaDialect` (2020-12), `enums`, `constants`, `schemas` (JSON Schema de `z.toJSONSchema` en modo `input`), `routes`, `operations`, `events` y `errors`. Las referencias entre esquemas son `#/schemas/Nombre` dentro del servicio y `../../<servicio>/export/contract.json#/schemas/Nombre` entre servicios. El archivo se formatea con Prettier para que `nx format:check` no lo marque.

### Generación del Dart

`front/tools/contracts_gen` (paquete del pub workspace, ejecutable `contracts_gen`) lee todos los `contract.json` y escribe `front/packages/contracts/lib/src/<servicio>/{enums,constants,types,schemas,http}/` con la cabecera `// GENERATED, do not edit.`. Con `--check` termina con código 1 si algún archivo cambia o sobra.

- Enums: `wireCode` y `tryParse`. Los enums con catálogo (`PlatformErrorCode`, `IdentityErrorCode`) solo incluyen los códigos públicos y llevan `code`, `httpStatus`, `retryable`, `messageKey` y `fromCode`.
- Constantes: clases `abstract final` con `static const`.
- Tipos: clases inmutables con `fromJson`, `toJson`, igualdad por valor y `encode` estático. Un valor desconocido de enum dentro de una lista se ignora; en un campo obligatorio lanza `FormatException`.
- Esquemas: `<Tipo>Schema.validate(json)` devuelve `List<FieldError>` con los mismos códigos y rutas que `fieldErrorsFromZod`, y la extensión `<Tipo>.validate()`.
- HTTP: `<Servicio>Routes` con un `RouteDescriptor` constante por ruta.

`lib/src/core/` sigue escrito a mano: `ProblemDetails`, `FieldError`, `ApiErrorException`, `ContractViolationException`, `RouteDescriptor` y los helpers del código generado. El generador no emite clases para `ProblemDetails` y `FieldError`, pero sí sus validadores.

### Validar antes de llamar

`front/packages/api` expone `ApiClient` con un puerto `HttpTransport` inyectable. Antes de enviar valida la petición con el validador generado; si falla, lanza `ContractViolationException` y no llama al transporte. Las respuestas de error se leen como `ProblemDetails` y se lanzan como `ApiErrorException`; las exitosas se validan y se decodifican con el tipo generado.

### CI

CI ejecuta `pnpm --dir backend nx run contracts-export:check` y `cd front && dart run contracts_gen --check`. Un cambio en un contrato obliga a confirmar en el mismo cambio el JSON exportado y el Dart generado.

## Consecuencias

### Positivas

- Una sola fuente de verdad: los enums de acceso, los códigos de error y las rutas se escriben una vez en TypeScript.
- El cliente rechaza una petición inválida sin llamar a la red y muestra el mismo error que daría el servidor.
- `messageKey` es la llave ARB, y una prueba del front exige mensaje en español e inglés para cada código público.
- El JSON intermedio sirve para otras herramientas (documentación, AsyncAPI, topología) sin leer TypeScript.

### Costos

- El generador soporta un subconjunto de JSON Schema: objetos, arrays, texto con longitud, patrón y formato (`uuid`, `email`, `date-time`), números con límites, enums, `const` y `X | null`. Un esquema con `oneOf`, `allOf` o `additionalProperties` como esquema falla al generar y hay que modelarlo de otra forma.
- Los patrones de zod se usan tal cual en `RegExp` de Dart; un patrón que dependa de una bandera de JavaScript habría que declararlo explícito.
- Los nombres de tipos son globales en Dart: dos servicios no pueden exportar el mismo nombre, y un nombre del contrato no debe chocar con clases de los microfrontends (por eso el monto se llama `MoneyAmount`).
- Cada servicio nuevo se registra a mano en `tools/contracts-export/src/registry.ts`; `check` lo recuerda.

## Alternativas consideradas

- OpenAPI con un generador Dart existente: no cubre operaciones internas, eventos ni catálogos de error, y los validadores generados no producen los mismos `FieldError` del servidor.
- Escribir los contratos en Dart y en TypeScript a mano con una prueba de sincronía: es lo que había y la auditoría mostró que se desincroniza.
