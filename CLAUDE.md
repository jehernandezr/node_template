# Guía para agentes de IA

Reglas para trabajar en este repositorio. Lee [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) antes de tocar la arquitectura.

## Estructura

- La raíz solo tiene `backend/` (workspace Nx + pnpm), `front/` (pub workspace de Flutter) y herramientas del repositorio (CI/CD, hooks, docs). Ver [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).
- Cada aplicación es dueña de sus librerías: lo compartido del backend vive en `backend/libs`, lo del front en `front/packages`, y lo compartido dentro de un servicio o microfrontend en su carpeta `shared/{enums,constants,types,utils}`.

## Comandos

- El backend se trabaja desde `backend/`. Ejecuta las comprobaciones con Nx: `pnpm nx ...`. Ejemplos: `pnpm nx affected -t lint test typecheck`, `pnpm nx test <proyecto>`.
- Usa `pnpm nx g @nx/js:library ...` para crear librerías y `backend/tools/generators` para servicios y módulos.
- Las configuraciones de Jest son `jest.config.cjs`.

## Código

- Las importaciones relativas en las librerías terminan en `.js`, porque el proyecto usa ESM con `nodenext`.
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

## Git

- Ramas con prefijo `feat/`, `fix/` o `chore/`.
- Commits con Conventional Commits. El hook `commit-msg` lo valida.
- Los mensajes de commit no incluyen líneas de atribución de IA ni líneas `Co-Authored-By`.
- Nunca confirmes un archivo `.env`. Usa `.env.example` para documentar variables.
- Nunca escribas secretos, tokens o contraseñas en el código, en los tests ni en la documentación.
