---
name: backend-pruebas
description: Cómo se escriben y ubican las pruebas del backend de node_template. Carpetas __tests__, dobles como clases, sin esperas fijas, integración con Testcontainers y cobertura mínima. Úsala al escribir o revisar pruebas del backend.
---

# Pruebas del backend

## Ubicación

- `src/<carpeta>/__tests__/<archivo>.spec.ts` para unitarias y `src/<carpeta>/__tests__/<archivo>.int-spec.ts` para integración. Ver la skill `backend-estructura`.
- End to end de una app: `backend/apps/<app>/e2e/`.

## Cómo se escriben

- Una prueba verifica un comportamiento, con nombre que lo dice: `rejects a password shorter than 12 characters`.
- Arrange, act, assert separados por una línea en blanco.
- Los dobles son clases que implementan el puerto (`InMemoryUserRepository`, `FixedClock`, `FakeRateLimiter`), no objetos sueltos con `jest.fn()` para todo. `jest.fn()` solo para verificar una llamada puntual.
- El tiempo se controla con `FixedClock` o temporizadores falsos. Nunca `sleep` ni esperas fijas: si algo es asíncrono, se espera la condición.
- Una prueba no depende del orden ni del estado de otra.

## Integración

- Contra servicios reales con Testcontainers (PostgreSQL, Valkey, LocalStack). Se saltan sin Docker en local y fallan sin Docker con `CI=true`.
- Cada suite de integración crea sus datos y no asume datos previos.
- Las migraciones de TypeORM corren de verdad en la base de prueba.

## Cobertura

- 80 % de líneas, sentencias y funciones, y 75 % de ramas por proyecto. El umbral vive en `backend/jest.preset.js`.
- La cobertura no se sube con pruebas que no verifican nada.
