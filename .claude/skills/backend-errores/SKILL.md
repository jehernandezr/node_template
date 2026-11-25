---
name: backend-errores
description: Cómo se modelan, traducen y registran los errores en el backend de node_template. Errores de dominio con código SERVICIO.SUBMÓDULO.ERROR, errores de infraestructura, clasificación de fallas, catálogo, traducción a Problem Details (RFC 9457) con un filtro global de NestJS y errores en consumidores y jobs. Úsala al lanzar, atrapar o traducir un error, o al crear un código de error nuevo.
paths:
  - 'backend/**/errors/**'
  - 'backend/**/*.error.ts'
  - 'backend/libs/contracts/**/errors/**'
---

# Errores

Hay tres tipos de error y cada uno se queda en su capa. El cliente reacciona al `code`; el `message` es solo para personas y no lleva valores de entrada.

| Tipo            | Quién lo lanza                   | Ejemplo                       | Cruza al cliente                    |
| --------------- | -------------------------------- | ----------------------------- | ----------------------------------- |
| Dominio         | Agregados y servicios de dominio | `EmailAlreadyRegisteredError` | Sí, con su código público           |
| Infraestructura | Adaptadores (base, cola, HTTP)   | `connection refused`, `23505` | Nunca tal cual: se traduce o es 500 |
| Programación    | Bugs                             | `TypeError`, invariante rota  | No: 500 con `traceId`               |

## Errores de dominio

- Extienden `DomainError` y llevan `code` de un enum del servicio con formato `SERVICIO.SUBMÓDULO.ERROR`. Los enums viven en `@contracts/<servicio>` (`enums/`), nunca como literal.
- Una clase por regla, con nombre de la regla. Sin `Error` genérico ni `throw new Error('...')` en negocio.
- `details` lleva datos útiles para el cliente y sin información sensible (ids, límites; no emails ni contraseñas).
- No reintentable por defecto. Un conflicto de concurrencia sí (`retryable: true`).

```ts
export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = IdentityErrorCode.EmailAlreadyRegistered;

  constructor() {
    super('The email is already registered');
  }
}
```

- Código nuevo: se agrega al enum, a `<servicio>ErrorCatalog` con `httpStatus`, `retryable`, `audience` y `description`, y se regenera el Dart del front en el mismo cambio. La prueba del catálogo falla si falta una entrada.
- Fallas esperadas de negocio se lanzan como `DomainError`. En flujos donde el llamador decide con ramas (sagas, validaciones en lote), se puede devolver `Result<T, E>` del kernel. Un mismo método no mezcla ambos estilos.
- La validación de entrada acumula todos los errores de campo y los devuelve juntos (`PLATFORM.VALIDATION.INVALID_INPUT` con `details.fieldErrors`). Las guardas del dominio fallan en la primera violación.

## Errores de infraestructura

- El adaptador atrapa el error de su librería y lo traduce a un error de dominio o a `PlatformError` con `cause`. Así el dominio no ve códigos de PostgreSQL.
- Violación de índice único (`23505`) se traduce a la regla de negocio correspondiente. Conflicto de versión a `ConcurrencyConflictError` reintentable. Interbloqueo (`40P01`) y falla de serialización (`40001`) a reintentable.
- Se clasifica con `FailureKind` y la clase `FailureClassifier` de `@platform/primitives` (`classify(error)`, `isTransient(error)`), a la que cada adaptador suma sus reglas: `Transient` se reintenta con backoff, `Permanent` no, `ProtocolViolation` nunca.
- Se conserva la causa: `new XError(message, details, { cause })`. Nunca se pierde el stack original.
- No se atrapa para callar. Un `catch` vacío o que solo loguea y sigue es un defecto.
- Se lanza y se rechaza solo con `Error`. `return await` dentro de `try` para que el `catch` lo vea.

## Traducción a HTTP: Problem Details

Un solo filtro global traduce todo con `toProblemDetails` de `@contracts/platform` (la forma exacta del filtro la fija la plataforma; este esquema es ilustrativo) a `application/problem+json` (RFC 9457). Se registra con `APP_FILTER` en el módulo de plataforma para poder inyectar `LoggerPort` y el catálogo.

```ts
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly catalog: ErrorCatalogLookup,
    private readonly logger: LoggerPort,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const entry = this.catalog.entryFor(exception);
    const problem = toProblemDetails({
      entry,
      title: entry.description,
      traceId: request.traceId,
      instance: request.url,
      typeBaseUrl: this.typeBaseUrl,
    });
    this.logger.error('request failed', {
      code: entry.code,
      traceId: request.traceId,
      cause: exception,
    });
    response
      .status(problem.status)
      .header('content-type', 'application/problem+json')
      .send(problem);
  }
}
```

- El cuerpo lleva `type`, `title`, `status`, `code`, `detail` (sin datos sensibles), `traceId` y, si aplica, `fieldErrors`.
- Código con audiencia `internal` o error desconocido: responde `PLATFORM.INTERNAL.UNEXPECTED` y `traceId`, sin mensaje original ni stack.
- Códigos de estado: validación 400, no autenticado 401, sin permiso 403, inexistente 404, conflicto de regla o versión 409, estado inválido 422, límite de tasa 429, dependencia caída 503. El estado sale del catálogo, no del controller.
- El dominio y la aplicación nunca lanzan `HttpException`.
- 404 versus 403: si saber que el recurso existe es sensible, responde 404.

## Consumidores y jobs

- Mismo punto central: un manejador de errores por tipo de disparador que clasifica, registra con `traceId`, cuenta una métrica y decide.
- Consumidor: error `Permanent` o de contrato va directo a la DLQ. `Transient` se reintenta con el backoff de la plataforma.
- Job: un error no atrapado no tumba el proceso, pero queda con alerta.
- Un error de programación inesperado (`unhandledRejection`, `uncaughtException`) se registra y el proceso termina limpio para que la plataforma lo reinicie.

## Pruebas

Verifica el `code`, no el mensaje: `await expect(promise).rejects.toMatchObject({ code: IdentityErrorCode.EmailAlreadyRegistered })`. Sin `try/catch` en la prueba.

## Con pstack

Carga primero `pstack-en-node-template`: dice cómo se lee una skill de pstack en Claude Code y qué regla manda cuando pstack y el repositorio no coinciden. Si el plugin no está instalado, esta sección no aplica.

- `principle-boundary-discipline`: se valida y se traduce donde los datos cruzan un borde (HTTP, mensajes, API interna, configuración), y adentro se confía en los tipos.
- `principle-fix-root-causes`: un `catch` o una guarda solo es arreglo si el estado que maneja es legítimo. Si no, se corrige donde nace el error.
- Para clasificar fallas transitorias y permanentes en reintentos, sagas o consumidores: `principle-make-operations-idempotent`.
