---
name: backend-pruebas
description: Cómo se escriben y ubican las pruebas del backend de node_template, por capas. Unitarias del dominio, de casos de uso con dobles como clases, de integración con Testcontainers (PostgreSQL, Valkey, LocalStack), de contrato zod, de componente y e2e con NestJS Testing. Carpetas __tests__, nombres, datos de prueba, sin esperas fijas y cobertura mínima. Úsala al escribir o revisar pruebas del backend.
paths:
  - 'backend/**/__tests__/**'
  - 'backend/**/e2e/**'
---

# Pruebas del backend

Se prueba comportamiento observable por capas, con el costo mínimo que da confianza. El patrón es un panal: mucho en componentes e integración, poco en unitarias de lógica real y muy poco e2e.

## Ubicación

- `src/<carpeta>/__tests__/<archivo>.spec.ts` para unitarias y `<archivo>.int-spec.ts` para integración. Ver `backend-estructura`.
- Contrato: `__tests__/<archivo>.contract-spec.ts`.
- End to end de una app: `backend/apps/<app>/e2e/<flujo>.e2e-spec.ts`.
- Utilitarios compartidos en `__tests__/utils/` (de la carpeta o, si los usan varias, de `src/__tests__/utils/`). Se exponen a otras librerías con el alias `@platform/<lib>/test-utils`. Nunca una carpeta `testing/` aparte.

## Las pruebas también son código

Las reglas de `backend-codigo-enterprise` aplican a las pruebas y a sus utilitarios:

- Fakes, builders y contenedores son clases con nombre de rol: `InMemoryUserRepository`, `UserBuilder`, `PostgresTestDatabase`. Nada de objetos sueltos copiados en cada prueba.
- Lo que se repite en dos pruebas sube a `__tests__/utils/`. Si lo usan dos carpetas, sube a `src/__tests__/utils/`.
- Un builder por agregado con valores por defecto válidos y métodos `with...` para lo que importa en cada prueba.
- Un fake implementa el puerto real y pasa la misma prueba de contrato que el adaptador real.
- Sin lógica en las pruebas: nada de `if` ni bucles que decidan qué verificar.
- Nombres, imports y tipos con el mismo cuidado que el código de producción.

## Qué probar en cada capa

| Capa            | Qué prueba                                                                              | Con qué                                  | Dobles                          |
| --------------- | --------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------- |
| Dominio         | Invariantes, transiciones, eventos emitidos                                             | Jest puro                                | Ninguno                         |
| Aplicación      | Un caso de uso: orquestación, errores, eventos al outbox                                | Jest                                     | Fakes en memoria de los puertos |
| Infraestructura | Repositorio, mapper, consumidor contra sistema real                                     | Testcontainers                           | Ninguno para la base            |
| Contrato        | El esquema zod acepta lo válido y rechaza lo inválido; productor y consumidor coinciden | Jest                                     | Ninguno                         |
| Componente      | Un módulo NestJS completo por HTTP                                                      | `@nestjs/testing` y supertest, base real | Solo servicios externos         |
| E2E             | Pocos flujos críticos con la app empaquetada                                            | docker-compose                           | Ninguno                         |

Detalle y recetas en `references/capas-y-testcontainers.md`.

## Cómo se escriben

- Una prueba verifica un comportamiento. El nombre dice unidad, escenario y resultado: `rejects a password shorter than 12 characters`. Dos niveles de `describe`: la unidad y el escenario.
- Arrange, act, assert separados por una línea en blanco. Un `act` y pocas aserciones.
- Se prueba la interfaz pública. Nunca métodos privados ni detalles internos: un refactor correcto no rompe pruebas.
- Sin lógica en la prueba: ni bucles ni condicionales. Si se repite una verificación, es un matcher o un helper con nombre.
- Los errores se verifican por `code`: `await expect(promise).rejects.toMatchObject({ code: ... })`. Nada de `try/catch`.
- Valores generados (ids, fechas) se verifican por forma, no por valor exacto (`expect.any(String)`), o se fijan con `FixedClock` e `SequentialIdGenerator`.
- Los datos de prueba salen de constructores con valores por defecto válidos y se sobreescribe solo lo que importa en la prueba: `aUser({ status: UserStatus.Suspended })`. El detalle relevante se ve en la prueba.
- Datos realistas (un email con formato de email), no "foo". Sin datos reales de personas.
- Snapshots solo pequeños y en línea. Nunca de un objeto grande.
- Una prueba no depende del orden ni del estado de otra, y cada una crea sus datos. Sin semillas globales.

```ts
describe('SignInUseCase', () => {
  describe('when the password is wrong five times', () => {
    it('locks the account and emits user.locked', async () => {
      const harness = SignInHarness.withUser(
        aUser({ email: 'ana@example.com' }),
      );

      for (let attempt = 0; attempt < 5; attempt++) {
        await harness.signInWith('wrong-password').catch(() => undefined);
      }

      expect(harness.users.get('ana@example.com').isLocked()).toBe(true);
      expect(harness.outbox.types()).toContain(UserEventType.Locked);
    });
  });
});
```

## Dobles

- Son clases que implementan el puerto: `InMemoryUserRepository`, `FixedClock`, `FakeRateLimiter`, `RecordingOutbox`. Se prefiere un fake con comportamiento a un mock.
- `jest.fn()` solo para verificar una llamada puntual que es un requisito (se envió el correo). No se verifica el orden ni el número de llamadas internas.
- Un fake en memoria debe cumplir la misma prueba de contrato que el adaptador real (`runUserRepositoryContract(factory)`), para que no diverjan.
- Servicios externos HTTP: interceptor (`nock`, MSW) con respuestas lentas, 503 y timeouts.
- No se mockea lo que no es tuyo cuando se puede levantar real (PostgreSQL, Valkey, LocalStack).

## Tiempo y asincronía

- El tiempo se controla con `FixedClock` o temporizadores falsos. Nunca `sleep` ni esperas fijas: si algo es asíncrono, se espera la condición (`await waitFor(() => ..., { timeoutMs })`) con un tiempo máximo.
- Pruebas paralelas seguras: bases por suite o esquema por suite, puertos aleatorios (`listen(0)`).
- Una prueba inestable no se reintenta ni se salta: se arregla o se elimina.

## Integración

- Contra servicios reales con Testcontainers (PostgreSQL, Valkey, LocalStack). Se saltan sin Docker en local y fallan sin Docker con `CI=true`.
- Los contenedores arrancan una vez por suite (`beforeAll`) y las pruebas aíslan sus datos con tenants o ids propios, o con transacciones que se deshacen.
- Las migraciones de TypeORM corren de verdad en la base de prueba, y una prueba verifica que no quedan cambios pendientes (`migration:generate` sin diferencias).
- Cada suite crea sus datos y no asume datos previos. Se limpia después de la suite, no entre pruebas.
- Los repositorios se prueban con casos que atrapan defectos reales: concurrencia (dos escrituras con la misma versión), unicidad, paginación por cursor, aislamiento entre tenants y número de consultas (sin N+1).

## Aserciones de un flujo

En una prueba de componente se piensa en cinco resultados: la respuesta, el estado nuevo, las llamadas salientes, los mensajes publicados y la observabilidad (log o métrica) cuando es un requisito.

## Cobertura

- 80 % de líneas, sentencias y funciones, y 75 % de ramas por proyecto. El umbral vive en `backend/jest.preset.js`.
- La cobertura no se sube con pruebas que no verifican nada. Los `catch` y los caminos de error cuentan.
- Una prueba de mutación (Stryker) sobre `domain/` y `application/` es la medida de que las pruebas verifican de verdad.

## Pruebas obligatorias por tipo de cambio

```
- [ ] Agregado o valor nuevo: invariantes y rechazos
- [ ] Caso de uso nuevo: camino feliz, cada error de dominio, eventos al outbox
- [ ] Repositorio o migración nueva: integración con PostgreSQL real
- [ ] Contrato nuevo: válido, inválido y compatibilidad hacia atrás
- [ ] Consumidor nuevo: duplicado, fuera de orden, mensaje inválido
- [ ] Endpoint nuevo: sin autenticar, sin permiso, otro tenant, entrada inválida
```
