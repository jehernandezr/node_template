# Plataforma backend

Monorepo reutilizable para construir backends de microservicios con NestJS, TypeORM y arquitectura hexagonal, desplegados en AWS, con clientes en Flutter. Sirve como punto de partida para cualquier producto nuevo: se clona, se renombra y se agregan servicios.

El plan completo incluye identidad con MFA, multitenancy, auditoría, mensajería con reintentos, sagas recuperables, archivos, notificaciones, facturación por uso y trazabilidad de punta a punta.

## Estado actual

- **Backend:** librerías de plataforma en `backend/libs/platform` (`kernel`, `primitives`, `config`, `observability`, `persistence`, `criteria`, `sharding`, `cache`, `bloom`, `resilience`, `rate-limit`, `messaging`, `internal-api`, `saga`), adaptadores `aws`, `postgres` y `valkey`, contratos `platform` e `identity` en `backend/libs/contracts` y las herramientas `contracts-export` y `app-bundler`.
- **Front:** shells `web` y `mobile`, siete microfrontends y los paquetes compartidos, con el Dart de los contratos generado en `front/packages/contracts` y los dobles de prueba compartidos en `front/packages/test_utils`.
- **Infraestructura:** Terraform por stacks (`network`, `platform`, `data`, `messaging`, `edge` y `service`) con runtime elegible por servicio (Lambda o Fargate), ambientes `local`, `dev`, `staging` y `prod`, y una base por shard de cada servicio más el catálogo.
- **Herramientas de IA:** skills de backend y front, hooks y agentes en `.claude/`.

Las fases, su estado, el orden de ejecución por olas y el registro de decisiones están en el [plan](docs/plan/README.md), la única fuente del plan del proyecto.

## Estructura del repositorio

```text
backend/        backend: dependencias externas en backend/package.json, alias en tsconfig.base.json
  libs/         librerías de plataforma, contratos (zod) y utilidades compartidas (proyectos de Nx)
  tools/        contracts-export (exporta los contratos a JSON) y app-bundler (esbuild)
  dist/<app>/   paquete de cada app, generado por el target build (fuera de git)
  infra/        Terraform por stacks (infra/terraform), scripts (infra/scripts) y entorno local (infra/local)
front/          pub workspace de Flutter
  apps/         shells web y mobile
  microfrontends/  un paquete por dominio
  packages/     api, auth, contracts, i18n, shell_core, shell_host, test_utils, tokens, ui, utils
  tools/        contracts_gen, plugin de Nx, check_deferred_chunks.dart y check_microfrontend_boundaries.dart
docs/           plan (plan/), arquitectura, ADRs, diseños por fase (design/), auditorías (audits/) y desarrollo local
.claude/        skills, hooks y agentes para las herramientas de IA
```

En la raíz solo quedan Nx como orquestador (`nx.json`, `package.json`, `pnpm-workspace.yaml`) y las herramientas del repositorio (`.github/`, `.husky/`, commitlint, lint-staged, Prettier y Renovate). Ver [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).

`pnpm install` deja un solo `node_modules`, en la raíz. Las librerías del backend son proyectos de Nx sin `package.json`: se importan por alias de TypeScript (`@platform/kernel`), su código va directo en `src/` y sus pruebas en la carpeta `__tests__/` de cada carpeta de código, con los utilitarios compartidos en `__tests__/utils/`. Solo las apps se compilan, con esbuild, en `backend/dist/<app>`.

## Requisitos

- Node 24, la versión fijada en [`.nvmrc`](.nvmrc). Con `nvm use` o `fnm use` se activa automáticamente.
- pnpm 10, habilitado con `corepack enable`. La versión exacta está en el campo `packageManager` de [`package.json`](package.json).
- Flutter, la versión fijada en [`front/.flutter-version`](front/.flutter-version).
- Docker con Docker Compose v2, para el stack local y las pruebas de integración con Testcontainers.
- Terraform, la versión fijada en [`backend/infra/terraform/.terraform-version`](backend/infra/terraform/.terraform-version), solo si vas a tocar la infraestructura.

## Comandos principales

Todos se corren desde la raíz, salvo que se indique otra carpeta.

```bash
corepack enable                                                   # habilita pnpm
pnpm install                                                      # instala Nx y el backend en un solo node_modules
(cd front && flutter pub get)                                     # prepara el front
pnpm nx affected -t lint test typecheck build analyze format-check   # valida lo que cambió (lo mismo que CI)
pnpm nx format:check                                              # revisa el formato con Prettier
pnpm nx run-many -t lint test typecheck build analyze             # valida todo el workspace (pnpm check)
pnpm nx test platform-saga                                        # prueba un proyecto del backend
pnpm nx test front-shell_core                                     # prueba un paquete del front
pnpm nx run contracts-export:export                               # exporta los contratos a JSON
pnpm nx run contracts-export:check                                # falla si el JSON exportado está desactualizado
(cd front && dart run contracts_gen)                              # regenera el Dart de los contratos
(cd front && dart run contracts_gen --check)                      # falla si el Dart generado está desactualizado
pnpm nx graph                                                     # abre el grafo de proyectos
```

El stack local se levanta desde `backend/`; los pasos están en [Desarrollo local](docs/local-development.md).

## Documentación

- [Plan](docs/plan/README.md): fases, estado, orden de ejecución por olas y registro de decisiones, con el detalle del [backend](docs/plan/backend.md) y del [front](docs/plan/front.md).
- [Arquitectura](docs/ARCHITECTURE.md): principios, estructura, reglas de dependencia y cómo está construida cada pieza.
- [Decisiones de arquitectura (ADR)](docs/adr/README.md): decisiones registradas durante la construcción.
- [Diseños](docs/design/): el diseño de F4 (identidad) y el de persistencia sobre TypeORM con sagas persistentes.
- [Auditorías](docs/audits/): revisiones de calidad del código, con sus hallazgos.
- [Desarrollo local](docs/local-development.md): preparación del entorno, stack de Docker, puertos y variables de entorno.
- [Contribuir](CONTRIBUTING.md): ramas, commits, revisión de PR y reglas del proyecto.
- [Guía para agentes de IA](CLAUDE.md): reglas que siguen las herramientas de codificación en este repositorio.
