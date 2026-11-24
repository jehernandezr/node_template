# 0033. Generadores de servicio y de módulo, y OpenAPI desde los contratos

- Estado: Aceptada
- Fecha: 2026-11-24
- Relacionados: [ADR 0015](0015-estructura-backend-front-y-codigo-compartido.md), [ADR 0017](0017-export-de-contratos.md)

## Contexto

F11 pide generar un servicio y un módulo con la estructura de los que ya existen, sin `@nx/devkit`, y publicar las rutas de cada contrato en OpenAPI sin `@nestjs/swagger`.

## Decisión

- **Proyecto `generators`** en `backend/tools/generators`, con plantillas de texto en `templates/` (archivos `.tpl`, que ni el compilador ni el lint toman como código) y sustitución de `__name__`, `__Name__`, `__NAME__`, `__nameCamel__` y `__name_snake__`. Lo generado pasa por prettier y nunca pisa un archivo existente.
- **`nx run generators:service -- --name=<n>`** crea la app (arranque, configuración, `project.json`, `app.module.ts` con las operaciones de traslado y un manifiesto vacío), el contrato con sus operaciones de traslado y los tfvars de `dev`, e imprime las líneas de los archivos compartidos, entre ellas la de `TenantMoveParticipants` de identity, sin la cual la saga `MoveTenant` no trasladaría los datos del servicio nuevo.
- **`nx run generators:module -- --service=<n> --name=<m>`** crea las capas del módulo, su fachada con su implementación y un fake, su bloque de migraciones y las líneas en `app.module.ts`, `database/shard-migrations.ts` y `migration-ranges.constants.ts`, en los marcadores `// generated:modules`. Calcula todo antes de escribir: si falta un marcador no deja nada a medias. Los servicios generados traen los marcadores y los cinco existentes también los tienen, así el generador sirve para todos.
- **`nx run generators:verify`** genera el esqueleto con el nombre `tasks` y compara byte a byte sus archivos de arranque y configuración: una plantilla que se aparta del servicio real falla.
- **`nx run generators:smoke`** genera en una copia temporal del workspace (los archivos de la raíz, `backend/` sin compilados ni reportes, el plugin de Nx del front y un enlace a `node_modules`) un servicio `smoke-probe` con un módulo `probe-items`, agrega las dos líneas compartidas sin las que no compila ni pasa el lint (el alias de su contrato en `tsconfig.base.json` y su `scope` en la regla de límites de `eslint.config.mjs`) y corre `lint`, `test`, `typecheck` y `build` del servicio y de su contrato, sin daemon de Nx ni caché. La copia se borra en todos los caminos. Tarda alrededor de un minuto, así que CI lo corre en cada cambio, en el trabajo de Nx.
- **OpenAPI.** `contracts-export` escribe `export/openapi.json` (OpenAPI 3.1) de cada contrato desde lo mismo que `contract.json`, en `export` y `check` y con el target `openapi`: rutas con parámetros, cuerpo, respuesta de éxito, un `default` con Problem Details y los códigos en `x-error-codes`, y permisos en `x-permissions`. Los `$ref` a otro contrato apuntan a su `openapi.json`.

## Consecuencias

### Positivas

- Un servicio nuevo nace igual a los existentes, y CI detecta cuando la plantilla y `tasks` se separan o cuando lo generado deja de pasar sus targets.
- Las rutas se publican sin dependencias nuevas y con los mismos esquemas que valida el código.

### Costos

- Las líneas de los archivos compartidos (alias, `init.sql`, `.env.example`, límites de Nx, dependencias de `contracts-export`) se agregan a mano. La prueba de humo agrega solo las dos que necesita para compilar; las demás no cambian lo que corren los cuatro targets.
- La prueba de humo depende de que la lista de servicios de la regla de límites siga escrita como `...[...].map(`: si cambia de forma, falla con un mensaje que lo dice.
- El servicio generado no trae un módulo `health`: los endpoints de salud ya los sirve el runtime.
