# Cómo contribuir

Este documento describe cómo proponer cambios al repositorio. Las reglas de arquitectura completas están en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Ramas

Cada cambio nace de `main` en una rama con prefijo según su tipo:

| Prefijo  | Uso                                        | Ejemplo               |
| -------- | ------------------------------------------ | --------------------- |
| `feat/`  | Funcionalidad nueva                        | `feat/tasks-crud`     |
| `fix/`   | Corrección de un error                     | `fix/mfa-code-expiry` |
| `chore/` | Mantenimiento, dependencias, configuración | `chore/husky-setup`   |

Usa nombres en minúsculas y separa las palabras con guiones.

## Commits

Los mensajes siguen [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```text
<tipo>(<alcance opcional>): <descripción en imperativo>
```

Tipos válidos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `perf`, `revert`. El hook `commit-msg` valida el formato con commitlint y rechaza los mensajes que no cumplan.

## Antes de abrir un PR

- [ ] La rama tiene prefijo `feat/`, `fix/` o `chore/`.
- [ ] `pnpm nx affected -t lint test typecheck` pasa sin errores.
- [ ] Los cambios respetan las capas hexagonales: el dominio no importa frameworks.
- [ ] Los identificadores de evento, error, permiso o cola usan enums, no literales de texto.
- [ ] Los identificadores nuevos son UUIDv7.
- [ ] Cada operación interna que modifica datos declara su compensación.
- [ ] Si cambió un contrato en `libs/contracts`, se regeneraron los clientes y se incluyeron los archivos generados.
- [ ] Una decisión nueva de arquitectura tiene su ADR en `docs/adr/`.
- [ ] No hay archivos `.env` ni secretos en el diff.

## Reglas de arquitectura

**Capas hexagonales.** Dentro de cada módulo, `domain` depende solo de `kernel`. El dominio no importa NestJS, TypeORM, AWS ni ninguna librería de infraestructura. Los casos de uso dependen del dominio, y `infrastructure` y `presentation` dependen de los dos. `dependency-cruiser` verifica estas reglas en CI.

**Enums en lugar de literales.** Los nombres de eventos, errores, permisos, colas y jobs se declaran como enums. Un cambio de nombre debe detectarlo el compilador, no una búsqueda de texto.

**Identificadores UUIDv7.** Toda entidad recibe su ID al crearse, generado por la aplicación con el puerto `IdGenerator`. En TypeORM se usa `@PrimaryColumn('uuid')`.

**Compensación declarada.** Cada operación interna que modifica datos declara cómo se revierte. Las sagas usan esa declaración para deshacer los pasos completados.

**Contratos regenerados.** Un cambio en `libs/contracts` obliga a ejecutar `nx run contracts:export` y regenerar los clientes de `front/` en el mismo PR. CI falla si lo generado quedó desactualizado.

**Decisiones en ADR.** Una decisión nueva de arquitectura, de dependencias o de convenciones se registra como ADR en `docs/adr/`, con el contexto, la decisión y sus consecuencias.

## Revisión

- Un PR pequeño y enfocado en un solo cambio se revisa más rápido.
- La descripción explica qué cambia y por qué.
- Los cambios de contrato, de migraciones o de permisos piden una revisión adicional.
