# Cómo contribuir

Este documento describe cómo proponer cambios al repositorio. Las reglas de arquitectura completas están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y la preparación del entorno en [docs/local-development.md](docs/local-development.md).

## Ramas

Cada cambio nace de `main` en una rama con prefijo según su tipo:

| Prefijo  | Uso                                        | Ejemplo               |
| -------- | ------------------------------------------ | --------------------- |
| `feat/`  | Funcionalidad nueva                        | `feat/tasks-crud`     |
| `fix/`   | Corrección de un error                     | `fix/mfa-code-expiry` |
| `chore/` | Mantenimiento, dependencias, configuración | `chore/husky-setup`   |

Usa nombres en minúsculas y separa las palabras con guiones.

## Commits

Los mensajes siguen [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/), en español y con el asunto en minúsculas:

```text
<tipo>(<alcance opcional>): <descripción en imperativo y en minúsculas>
```

Ejemplos tomados del historial:

```text
feat(contracts): catalogar los códigos nuevos de internal-api y saga
fix(primitives): clasificar el throttling del sdk de aws como falla pasajera
chore: conectar los módulos nuevos en la raíz de terraform
```

Tipos válidos: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci` y `revert`. El alcance suele ser el proyecto o la carpeta que cambia (`saga`, `contracts`, `front`, `infra`).

Los mensajes no incluyen líneas de atribución de IA ni líneas `Co-Authored-By`.

### Hooks

`pnpm install` instala los hooks de Husky:

- `commit-msg` valida el mensaje con commitlint (`@commitlint/config-conventional`) y rechaza los que no cumplan.
- `pre-commit` corre lint-staged sobre los archivos preparados: Prettier para JS, TS, JSON, Markdown y YAML; ESLint con `--fix` para el TypeScript de `backend/`; `dart format` para el Dart de `front/`.

Los hooks usan `pnpm exec`, así que necesitan `pnpm` en el `PATH` de la terminal o del editor que hace el commit.

## Antes de abrir un PR

Desde la raíz, con `pnpm install` hecho y `flutter pub get` corrido en `front/`:

```bash
pnpm nx affected -t lint test typecheck build analyze format-check
pnpm nx format:check
```

Si cambiaste un contrato, además:

```bash
pnpm nx run contracts-export:export
(cd front && dart run contracts_gen)
pnpm nx run contracts-export:check
(cd front && dart run contracts_gen --check)
```

Lista de revisión:

- [ ] La rama tiene prefijo `feat/`, `fix/` o `chore/`.
- [ ] Los comandos anteriores pasan sin errores.
- [ ] Los cambios respetan las capas hexagonales: el dominio no importa frameworks.
- [ ] Los identificadores de evento, error, permiso, cola o job usan enums, no literales de texto.
- [ ] Los códigos de error nuevos tienen el formato `SERVICIO.SUBMÓDULO.ERROR` y su entrada en el catálogo.
- [ ] Los identificadores nuevos son UUIDv7.
- [ ] Cada operación interna que modifica datos declara su compensación.
- [ ] Si cambió un contrato en `backend/libs/contracts`, el `export/contract.json` y el Dart de `front/packages/contracts` están regenerados en el mismo PR.
- [ ] Una decisión nueva de arquitectura tiene su ADR en `docs/adr/`.
- [ ] No hay archivos `.env` ni secretos en el diff.

## Reglas de arquitectura

**Raíz mínima.** La raíz solo tiene `backend/`, `front/`, Nx y las herramientas del repositorio. Lo compartido del backend vive en `backend/libs`, lo del front en `front/packages`, y lo compartido dentro de un servicio o microfrontend en su carpeta `shared/{enums,constants,types,utils}`. Ver [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).

**Capas hexagonales.** Dentro de cada módulo, `domain` depende solo de `kernel`. El dominio no importa NestJS, TypeORM, AWS ni ninguna librería de infraestructura. Los casos de uso dependen del dominio, y `infrastructure` y `presentation` dependen de los dos.

**Límites entre proyectos.** La regla `@nx/enforce-module-boundaries` de `backend/eslint.config.mjs` limita las dependencias por tags (`type:contracts`, `type:util`, `type:platform`, `type:tool`, `type:app`). El target `lint` la verifica.

**Enums en lugar de literales.** Los nombres de eventos, errores, permisos, colas y jobs se declaran como enums. Un cambio de nombre debe detectarlo el compilador, no una búsqueda de texto.

**Identificadores UUIDv7.** Toda entidad recibe su ID al crearse, generado por la aplicación con el puerto `IdGenerator`. En TypeORM se usa `@PrimaryColumn('uuid')`.

**Compensación declarada.** Cada operación interna que modifica datos declara cómo se revierte con `compensatedBy`, o `Compensation.None` con un motivo. Las sagas usan esa declaración para deshacer los pasos completados.

**Contratos regenerados.** Los contratos se escriben en TypeScript con zod en `backend/libs/contracts/<servicio>`. Un cambio ahí obliga a exportar el JSON y regenerar el Dart en el mismo PR. El job `contracts` de CI falla si lo generado quedó desactualizado. Ver [ADR 0017](docs/adr/0017-export-de-contratos.md).

**Validar antes de llamar.** Todo cliente, del backend o del front, valida la petición contra el contrato antes de llamar.

**Decisiones en ADR.** Una decisión nueva de arquitectura, de dependencias o de convenciones se registra como ADR en `docs/adr/`, con el contexto, la decisión y sus consecuencias. Ver [cómo agregar un ADR](docs/adr/README.md).

## CI

Cada PR corre `ci.yml` y `security.yml`. El único check requerido para `main` es `ci-ok`, que agrega el resultado de todos los jobs. El detalle está en el [ADR 0019](docs/adr/0019-ci-y-toolchain.md).

## Revisión

- Un PR pequeño y enfocado en un solo cambio se revisa más rápido.
- La descripción sigue la plantilla del repositorio: qué cambia, por qué y cómo se probó.
- Los cambios de contrato, de migraciones o de permisos piden una revisión adicional.
