---
name: backend-errores
description: 'Errores del backend: códigos SERVICIO.SUBMÓDULO.ERROR, clasificación de fallas, catálogo y Problem Details. Úsala al lanzar, atrapar o traducir un error.'
paths:
  - 'backend/**/errors/**'
  - 'backend/**/*.error.ts'
  - 'backend/libs/contracts/**/errors/**'
---

# Errores

El cliente reacciona al `code`. El `message` es para personas y no lleva valores de entrada.

- Dominio: lo lanzan agregados y servicios de dominio; cruza al cliente con su código público.
- Infraestructura (`connection refused`, `23505`): nunca cruza tal cual; se traduce o es 500.
- Programación (`TypeError`, invariante rota): 500 con `traceId`.

## Errores de dominio

- Extienden `DomainError` con `code` de un enum del servicio en formato `SERVICIO.SUBMÓDULO.ERROR`. Los enums viven en `@contracts/<servicio>` (`enums/`).
- Una clase por regla. Nunca `throw new Error('...')` en negocio.
- `details` sin datos sensibles (ids y límites sí; emails y contraseñas no).
- No reintentable por defecto; un conflicto de concurrencia sí (`retryable: true`).
- Código nuevo: entra al enum y a `<servicio>ErrorCatalog` con `httpStatus`, `retryable`, `audience` y `description`, y se regenera el Dart del front en el mismo cambio. La prueba del catálogo falla si falta una entrada.
- Fallas de negocio como `DomainError`. Donde el llamador decide con ramas (sagas, lotes) se puede devolver `Result<T, E>` del kernel. Un método no mezcla ambos.
- La validación de entrada acumula los errores de campo (`PLATFORM.VALIDATION.INVALID_INPUT` con `details.fieldErrors`). Las guardas del dominio fallan en la primera.

## Errores de infraestructura

- El adaptador traduce el error de su librería a un error de dominio o a `PlatformError` con `cause`.
- `23505` se traduce a la regla de negocio. Conflicto de versión a `ConcurrencyConflictError` reintentable. `40P01` y `40001` a reintentable.
- Se clasifica con `FailureKind` y `FailureClassifier` de `@platform/primitives` (`classify`, `isTransient`), al que cada adaptador suma reglas: `Transient` se reintenta con backoff, `Permanent` no, `ProtocolViolation` nunca.
- Se conserva la causa: `new XError(message, details, { cause })`.

## Problem Details

- Un filtro global traduce todo con `toProblemDetails` de `@contracts/platform` a `application/problem+json`. Se registra con `APP_FILTER` en el módulo de plataforma para inyectar `LoggerPort` y el catálogo. Esquema en `references/problem-details-filter.md`.
- Cuerpo: `type`, `title`, `status`, `code`, `detail`, `traceId` y, si aplica, `fieldErrors`.
- Audiencia `internal` o error desconocido: `PLATFORM.INTERNAL.UNEXPECTED` y `traceId`, sin mensaje ni stack.
- Estados: validación 400, no autenticado 401, sin permiso 403, inexistente 404, conflicto 409, estado inválido 422, tasa 429, dependencia caída 503. Salen del catálogo, no del controller.
- El dominio y la aplicación nunca lanzan `HttpException`.
- Si saber que el recurso existe es sensible, 404 en vez de 403.

## Consumidores y jobs

- Un manejador por tipo de disparador que clasifica, registra con `traceId`, cuenta una métrica y decide.
- Consumidor: `Permanent` o de contrato a la DLQ; `Transient` se reintenta con el backoff de la plataforma.
- Job: un error no atrapado no tumba el proceso, pero alerta.
- `unhandledRejection` o `uncaughtException`: se registra y el proceso termina limpio.

## Pruebas

Se verifica el `code`: `await expect(promise).rejects.toMatchObject({ code: IdentityErrorCode.EmailAlreadyRegistered })`. Sin `try/catch`.

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-boundary-discipline`, `principle-fix-root-causes`, `principle-make-operations-idempotent`.
