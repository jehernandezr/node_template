# Guía para agentes de IA

Reglas para trabajar en este repositorio. Lee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de tocar la arquitectura.

## Estructura

- La raíz solo tiene `backend/`, `front/` (pub workspace de Flutter), Nx como orquestador y herramientas del repositorio (CI/CD, hooks, docs). Ver [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).
- Cada aplicación es dueña de sus librerías: lo compartido del backend vive en `backend/libs`, lo del front en `front/packages`, y lo compartido dentro de un servicio o microfrontend en su carpeta `shared/{enums,constants,types,utils}`.

## Comandos

- Nx corre desde la raíz y cubre backend y front. Prepara con `pnpm install` en la raíz y `flutter pub get` en `front/`. Ejemplos: `pnpm nx affected -t lint test typecheck build analyze format-check`, `pnpm nx test platform-saga`, `pnpm nx test front-shell_core`.
- Crea librerías del backend siguiendo la skill `backend-estructura` (proyecto de Nx sin `package.json`). Los generadores de servicios y módulos llegan en la fase F11; mientras tanto, un servicio nuevo sigue la estructura del [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).
- Las configuraciones de Jest son `jest.config.cjs`.

## Código

- Antes de escribir, revisar o integrar código, carga las skills de `.claude/skills`. Se cargan solas según la carpeta que toques (`paths`); la puerta de entrada es `backend-codigo-enterprise` en el backend y `front-codigo` en el front, y cada una enlaza a las demás.
- Clases, composición e inyección de dependencias por constructor. Las únicas funciones exportadas son utilidades puras sin estado y las de la lista declarada en `check-structure.mjs` (fábricas `define*` de contracts, esquemas de `env.ts` y `secret()`, `main()` de las herramientas). Nada de módulos de funciones sueltas tipo script.
- Persistencia con TypeORM ([ADR 0024](docs/adr/0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)): entidades y migraciones generadas y aplicadas con su CLI. `synchronize` siempre apagado.
- Backend: las pruebas van en una carpeta `__tests__/` dentro de la carpeta del código que prueban, nunca un `.spec.ts` junto al archivo fuente. Las de integración terminan en `.int-spec.ts`; lo que otra librería necesita de ellas sale por `@platform/<lib>/test-utils`. Front: en el `test/` de cada paquete, con las carpetas de `lib/src`.
- Backend: código directo en `src/`, sin `src/lib/`. Un solo `node_modules`: las librerías se importan por alias de TypeScript y no tienen `package.json`.
- Las importaciones relativas en las librerías terminan en `.js`, porque el proyecto usa ESM con `nodenext`.
- Todo puerto es una clase abstracta sin decoradores y es su propio token de inyección. El cableado de NestJS de una librería vive en `src/nest/` y sale por `@platform/<lib>/nest`; fuera de esa carpeta no se importa `@nestjs/*` ([ADR 0025](docs/adr/0025-capa-nestjs-por-sub-entrada-y-puertos-abstractos.md)).
- Las tareas periódicas son clases que extienden `ScheduledJob` y las corre `@platform/scheduling` ([ADR 0026](docs/adr/0026-jobs-programados-scheduledjob-y-joblock.md)). Nada de `setInterval` propio en una librería.
- El dominio (`domain/`) no importa NestJS, TypeORM, AWS ni otras librerías de infraestructura. Solo depende de `kernel`.
- `application/` depende de `domain/`. `infrastructure/` y `presentation/` dependen de `domain/` y `application/`.
- `@aws-sdk/*` solo aparece en `backend/libs/platform/adapters/aws`.
- Usa enums para eventos, errores, permisos, colas y jobs. No escribas esos identificadores como literales de texto.
- Todo identificador nuevo es UUIDv7, generado con el puerto `IdGenerator`.
- Cada operación interna que modifica datos declara su compensación.
- Los contratos se escriben en TypeScript con zod en `backend/libs/contracts/<servicio>`, con carpetas `enums`, `constants`, `types`, `schemas`, `http`, `internal` y `events`.
- Un cambio en `backend/libs/contracts` obliga a regenerar el Dart de `front/packages/contracts` en el mismo cambio.
- Todo cliente (backend o front) valida la petición contra el contrato antes de llamar por HTTP.
- Una decisión nueva de arquitectura se registra como ADR en `docs/adr/`.
- Los errores de dominio extienden `DomainError` y usan un código del formato `SERVICIO.SUBMÓDULO.ERROR`.
- Front: cada pantalla con estado tiene un controlador y las pruebas comparten `test_utils` ([ADR 0027](docs/adr/0027-patrones-de-pantalla-y-pruebas-del-front.md)).

## Git

- Ramas con prefijo `feat/`, `fix/` o `chore/`.
- Commits con Conventional Commits. El hook `commit-msg` lo valida.
- Los mensajes de commit no incluyen líneas de atribución de IA ni líneas `Co-Authored-By`.
- Nunca confirmes un archivo `.env`. Usa `.env.example` para documentar variables.
- Nunca escribas secretos, tokens o contraseñas en el código, en los tests ni en la documentación.
