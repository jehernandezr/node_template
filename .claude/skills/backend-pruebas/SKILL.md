---
name: backend-pruebas
description: 'Pruebas del backend por capas: ubicación, dobles como clases, Testcontainers, contrato y e2e. Úsala al escribir o revisar pruebas del backend.'
paths:
  - 'backend/**/__tests__/**'
  - 'backend/**/e2e/**'
---

# Pruebas del backend

Se prueba por capas, con el costo mínimo que da confianza. El patrón es un panal: mucho en componentes e integración, poco en unitarias de lógica real y muy poco e2e.

## Ubicación

- `src/<carpeta>/__tests__/<archivo>.spec.ts` para unitarias y `<archivo>.int-spec.ts` para integración. Ver `backend-estructura`.
- Contrato de un puerto: la prueba compartida `run<Puerto>Contract(factory)` vive en `src/__tests__/utils/`, sale por `@platform/<lib>/test-utils` y la llaman, desde su propio `.spec.ts` o `.int-spec.ts`, el doble en memoria y el adaptador real. Las pruebas de esquemas zod son `.spec.ts` normales.
- Las pruebas de integración terminan en `.int-spec.ts`. Un archivo `*.integration.spec.ts` correría como unitaria y lo rechazan `check-structure.mjs` y el lint.
- End to end de una app: `backend/apps/<app>/e2e/<flujo>.e2e-spec.ts`.
- Utilitarios compartidos en `__tests__/utils/` (de la carpeta o, si los usan varias, de `src/__tests__/utils/`). Se exponen a otras librerías con el alias `@platform/<lib>/test-utils`. Nunca una carpeta `testing/` aparte. Los dobles de un puerto no se exportan desde el `index.ts` público: salen solo por `@platform/<lib>/test-utils`.

## Las pruebas también son código

Las reglas de `backend-codigo-enterprise` aplican a las pruebas y a sus utilitarios:

- Fakes, builders y contenedores son clases con nombre de rol: `InMemoryUserRepository`, `UserBuilder`, `PostgresTestDatabase`. Nada de objetos sueltos copiados en cada prueba.
- Lo que se repite en dos pruebas sube a `__tests__/utils/`. Si lo usan dos carpetas, sube a `src/__tests__/utils/`.
- Un builder por agregado con valores por defecto válidos y métodos `with...` para lo que importa en cada prueba.
- Un fake implementa el puerto real y pasa la misma prueba de contrato que el adaptador real.
- Sin lógica en las pruebas: nada de `if` ni bucles que decidan qué verificar.
- Nombres, imports y tipos con el mismo cuidado que el código de producción.

## Qué probar en cada capa

- Dominio: qué prueba: Invariantes, transiciones, eventos emitidos; con qué: Jest puro
- Aplicación: qué prueba: Un caso de uso: orquestación, errores, eventos al outbox; con qué: Jest; dobles: Fakes en memoria de los puertos
- Infraestructura: qué prueba: Repositorio, mapper, consumidor contra sistema real; con qué: Testcontainers; dobles: Ninguno para la base
- Contrato: qué prueba: El esquema zod acepta lo válido y rechaza lo inválido; productor y consumidor coinciden; con qué: Jest
- Componente: qué prueba: Un módulo NestJS completo por HTTP; con qué: `@nestjs/testing` y supertest, base real; dobles: Solo servicios externos
- E2E: qué prueba: Pocos flujos críticos con la app empaquetada; con qué: docker-compose

Detalle y recetas en `references/capas-y-testcontainers.md`.

## Cómo se escriben

- Una prueba verifica un comportamiento. El nombre dice unidad, escenario y resultado: `rejects a password shorter than 12 characters`. Dos niveles de `describe`: la unidad y el escenario.
- Arrange, act, assert separados por una línea en blanco. Un `act` y pocas aserciones.
- Sin lógica en la prueba: ni bucles ni condicionales. Si se repite una verificación, es un matcher o un helper con nombre.
- Los errores se verifican por `code`: `await expect(promise).rejects.toMatchObject({ code: ... })`. Nada de `try/catch`.
- Valores generados (ids, fechas) se verifican por forma, no por valor exacto (`expect.any(String)`), o se fijan con `FixedClock` e `SequentialIdGenerator`.
- Los datos de prueba salen de constructores con valores por defecto válidos y se sobreescribe solo lo que importa en la prueba: `aUser({ status: UserStatus.Suspended })`. El detalle relevante se ve en la prueba.
- Datos realistas (un email con formato de email), no "foo". Sin datos reales de personas.
- Snapshots solo pequeños y en línea. Nunca de un objeto grande.
- Una prueba no depende del orden ni del estado de otra, y cada una crea sus datos. Sin semillas globales.

Ejemplo en `references/ejemplos.md`, sección "Cómo se escriben".

- Las tablas de casos van con `it.each`, no con bucles ni `if`.
- Cada archivo de prueba corresponde a una clase. Si prueba varias, se parte.

## Dobles

- Son clases que implementan el puerto: `InMemoryUserRepository`, `FixedClock`, `FakeRateLimiter`, `InMemoryBus`. Se prefiere un fake con comportamiento a un mock.
- Si la cantidad de llamadas es un requisito (la deduplicación de cargas de `PlacementLoader`), se usa un fake con comportamiento y un contador público, no `jest.fn` con `toHaveBeenCalledTimes`.
- Un fake en memoria debe cumplir la misma prueba de contrato que el adaptador real (`runUserRepositoryContract(factory)`), para que no diverjan.
- Servicios externos HTTP: interceptor (`nock`, MSW) con respuestas lentas, 503 y timeouts.
- La aleatoriedad, los ids y el tiempo se controlan con dobles de `RandomSource`, `IdGenerator` (`SequentialIdGenerator`) y `Clock` (`FixedClock`). Nada de `Math.random` ni `Date.now` en el código bajo prueba.

## Dobles que se quedan en producción

Son un modo de ejecución y no un doble, así que siguen en el índice público: `InMemoryCache` (único modo sin Valkey), `InMemoryRateLimiter` (lo usa `DegradingRateLimiter`), `NoopMetrics`, `InProcessJobLock`, `NullRoutingCache` e `InProcessDirectoryChannel`. Los demás dobles van a `test-utils`:

- `InMemoryIdempotencyStore`: sale por: `@platform/kernel/test-utils`; contrato: `runIdempotencyStoreContract`
- `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`: sale por: `@platform/messaging/test-utils`; contrato: `runOutboxStoreContract`, `runProcessedMessageStoreContract`
- `InMemoryProcessedOperationStore`: sale por: `@platform/internal-api/test-utils`; contrato: `runIdempotencyStoreContract`
- `InMemorySagaStore`: sale por: `@platform/saga/test-utils`; contrato: `runSagaStoreContract`
- `InMemoryDirectoryStore`: sale por: `@platform/sharding/test-utils`; contrato: `runDirectoryStoreContract`
- `InMemoryRoutingCache`: sale por: `@platform/sharding/test-utils`; contrato: `runRoutingCacheContract`
- `InMemoryMetrics`: sale por: `@platform/observability/test-utils`
- `FakeSqsClient`, `FakeSnsClient`: sale por: `@platform/adapters-aws/test-utils`

## Tiempo y asincronía

- El tiempo se controla con `FixedClock` o temporizadores falsos. Nunca `sleep` ni esperas fijas: si algo es asíncrono, se espera la condición (`await waitFor(() => ..., { timeoutMs })`) con un tiempo máximo.
- Pruebas paralelas seguras: bases por suite o esquema por suite, puertos aleatorios (`listen(0)`).
- Una prueba inestable no se reintenta ni se salta: se arregla o se elimina.

## Integración

- Contra servicios reales con Testcontainers (PostgreSQL, Valkey, LocalStack). `ContainerRuntime` de `@platform/kernel/test-utils` decide si hay Docker según la variable `INTEGRATION_TESTS`: `skip` (por defecto fuera de CI, la suite se omite sin Docker) o `require` (CI, falla sin Docker). `describeIfAvailable(name, body)` envuelve cada suite de integración. No hay banderas por servicio. `pg-mem` no se usa: la capa TypeORM se prueba con Testcontainers.

Ejemplo en `references/ejemplos.md`, sección "Integración".

En CI: `INTEGRATION_TESTS=require pnpm nx test <proyecto>`.

- Los contenedores arrancan una vez por suite (`beforeAll`) y las pruebas aíslan sus datos con tenants o ids propios, o con transacciones que se deshacen.
- Las migraciones de TypeORM corren de verdad en la base de prueba, y una prueba verifica que no quedan cambios pendientes (`migration:generate` sin diferencias).
- Cada suite crea sus datos y no asume datos previos. Se limpia después de la suite, no entre pruebas.
- Los repositorios se prueban con casos que atrapan defectos reales: concurrencia (dos escrituras con la misma versión), unicidad, paginación por cursor, aislamiento entre tenants y número de consultas (sin N+1).

## Aserciones de un flujo

En una prueba de componente se piensa en cinco resultados: la respuesta, el estado nuevo, las llamadas salientes, los mensajes publicados y la observabilidad (log o métrica) cuando es un requisito.

## Cobertura

- 80 % de líneas, sentencias y funciones, y 75 % de ramas por proyecto. El umbral vive en `backend/jest.preset.js`.
- Los `catch` y los caminos de error cuentan.
- Una prueba de mutación (Stryker) sobre `domain/` y `application/` es la medida de que las pruebas verifican de verdad.

## Pruebas obligatorias por tipo de cambio

```
- [ ] Agregado o valor nuevo: invariantes y rechazos
- [ ] Caso de uso nuevo: camino feliz, cada error de dominio, eventos publicados
- [ ] Repositorio o migración nueva: integración con PostgreSQL real
- [ ] Contrato nuevo: válido, inválido y compatibilidad hacia atrás
- [ ] Consumidor nuevo: duplicado, fuera de orden, mensaje inválido
- [ ] Endpoint nuevo: sin autenticar, sin permiso, otro tenant, entrada inválida
- [ ] Puerto nuevo: prueba de contrato run<Puerto>Contract contra el doble y contra el adaptador real
- [ ] Job nuevo: una prueba que llama a run() directamente
```

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-test-behavior-not-implementation`, `typescript-best-practices`, `tdd`, `principle-prove-it-works`, `interrogate`.
