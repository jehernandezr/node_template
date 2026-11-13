# Plataforma backend

Monorepo reutilizable para construir backends de microservicios con NestJS, TypeORM y arquitectura hexagonal, desplegados en AWS, con clientes en Flutter. Sirve como punto de partida para cualquier producto nuevo: se clona, se renombra y se agregan servicios.

El plan completo incluye identidad con MFA, multitenancy, auditoría, mensajería con reintentos, sagas recuperables, archivos, notificaciones, facturación por uso y trazabilidad de punta a punta.

## Estado actual

- **Backend:** librerías de plataforma en `backend/libs/platform` (`kernel`, `primitives`, `config`, `observability`, `internal-api`, `saga`, `messaging`, `resilience`, `cache`, `bloom`, `sharding`, `criteria`), contratos `platform` e `identity` en `backend/libs/contracts` y la herramienta `contracts-export`.
- **Front:** shells `web` y `mobile`, siete microfrontends y los paquetes compartidos, con el Dart de los contratos generado en `front/packages/contracts`.
- **Infraestructura:** raíz `platform` de Terraform con sus módulos en `backend/infra/terraform`.

El siguiente paso es el primer servicio en `backend/apps/`. El orden completo está en [Fases de construcción](docs/ARCHITECTURE.md#fases-de-construcción).

## Estructura del repositorio

```text
backend/        workspace pnpm del backend
  libs/         librerías de plataforma, contratos (zod) y utilidades compartidas
  tools/        contracts-export: exporta los contratos a JSON
  infra/        Terraform (infra/terraform) y scripts del entorno local (infra/local)
front/          pub workspace de Flutter
  apps/         shells web y mobile
  microfrontends/  un paquete por dominio
  packages/     api, auth, contracts, i18n, realtime, shell_core, tokens, ui, utils
  tools/        contracts_gen, plugin de Nx y check_deferred_chunks.dart
docs/           arquitectura, ADRs y guía de desarrollo local
```

En la raíz solo quedan Nx como orquestador (`nx.json`, `package.json`, `pnpm-workspace.yaml`) y las herramientas del repositorio (`.github/`, `.husky/`, commitlint, lint-staged, Prettier y Renovate). Ver [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).

## Requisitos

- Node 24, la versión fijada en [`.nvmrc`](.nvmrc). Con `nvm use` o `fnm use` se activa automáticamente.
- pnpm 10, habilitado con `corepack enable`. La versión exacta está en el campo `packageManager` de [`package.json`](package.json).
- Flutter, la versión fijada en [`front/.flutter-version`](front/.flutter-version).
- Docker con Docker Compose v2, para el stack local.
- Terraform, la versión fijada en [`backend/infra/terraform/.terraform-version`](backend/infra/terraform/.terraform-version), solo si vas a tocar la infraestructura.

## Comandos principales

Todos se corren desde la raíz, salvo que se indique otra carpeta.

```bash
corepack enable                                                   # habilita pnpm
pnpm install                                                      # instala Nx y el backend
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

- [Arquitectura](docs/ARCHITECTURE.md): principios, estructura, reglas de dependencia y plan por fases.
- [Decisiones de arquitectura (ADR)](docs/adr/README.md): decisiones registradas durante la construcción.
- [Desarrollo local](docs/local-development.md): preparación del entorno, stack de Docker, puertos y variables de entorno.
- [Contribuir](CONTRIBUTING.md): ramas, commits, revisión de PR y reglas del proyecto.
- [Guía para agentes de IA](CLAUDE.md): reglas que siguen las herramientas de codificación en este repositorio.
