# Plataforma backend

Monorepo reutilizable para construir backends de microservicios con NestJS, TypeORM y arquitectura hexagonal, desplegados en AWS. Sirve como punto de partida para cualquier producto nuevo: se clona, se renombra y se agregan servicios con un generador.

Incluye identidad con MFA, multitenancy, auditoría, mensajería con reintentos, sagas recuperables, archivos, notificaciones, facturación por uso y trazabilidad de punta a punta.

## Estado actual

La plataforma está en las fases F0 (limpieza) y F1 (base de plataforma). Las librerías `kernel`, `config`, `observability` y `contracts/platform` ya existen. El orden completo de las fases está en [Fases de construcción](docs/ARCHITECTURE.md#fases-de-construcción).

## Estructura del repositorio

```text
apps/       servicios del backend (un servicio por carpeta)
libs/       librerías de plataforma y contratos compartidos
front/      clientes Flutter (shells web y mobile, microfrontends y paquetes)
infra/      Terraform por servicio y región
tools/      generadores de Nx (microservicio, módulo hexagonal, microfrontend)
docs/       arquitectura, ADRs y guía de desarrollo local
```

## Requisitos

- Node 24, la versión fijada en [`.nvmrc`](.nvmrc). Con `nvm use` o `fnm use` se activa automáticamente.
- pnpm, habilitado con `corepack enable`.
- Docker, para el stack local de PostgreSQL, Valkey, OpenObserve y demás servicios de apoyo.

## Comandos principales

```bash
corepack enable                                  # habilita pnpm
pnpm install                                     # instala dependencias
docker compose up -d                             # levanta el stack local
pnpm nx run-many -t lint test typecheck          # valida todo el workspace
pnpm nx affected -t test                         # prueba solo lo que cambió
pnpm nx g @nx/js:library ...                     # crea una librería nueva
```

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md): principios, estructura, reglas de dependencia y plan por fases.
- [Decisiones de arquitectura (ADR)](docs/adr/): decisiones registradas durante la construcción.
- [Desarrollo local](docs/local-development.md): stack de Docker, puertos y variables de entorno.
- [Contribuir](CONTRIBUTING.md): ramas, commits, revisión de PR y reglas del proyecto.
- [Guía para agentes de IA](CLAUDE.md): reglas que siguen las herramientas de codificación en este repositorio.
