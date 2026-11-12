# 0015. Estructura del repositorio y código compartido por aplicación

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

El repositorio mezclaba en la raíz el workspace Node (Nx, pnpm, librerías, Terraform) con el front Flutter. Además, los enums, constantes y tipos que comparten los servicios y los microfrontends vivían dispersos, y los contratos solo existían en Dart o solo en TypeScript.

## Decisión

### Raíz del repositorio

La raíz contiene solo:

- `backend/`: apps, librerías, herramientas e infraestructura del backend, con sus herramientas de TypeScript (Jest, ESLint, `tsconfig.base.json`) en `backend/package.json`.
- `front/`: pub workspace de Flutter (shells, microfrontends, paquetes, herramientas).
- Nx como orquestador: `nx.json`, `package.json` (Nx, sus plugins y las herramientas de git), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.nvmrc` y un `tsconfig.json` de solución que Nx exige en la raíz para sincronizar las referencias.
- Lo propio del repositorio: `.github/` (CI/CD), `.husky/`, `commitlint.config.mjs`, `lint-staged.config.mjs`, Prettier, `docs/`, `README.md`, `CLAUDE.md` y `renovate.json`.

Cada aplicación es dueña de sus librerías y utilidades. Nada compartido entre backend y front vive en la raíz: el front recibe los contratos generados desde el backend.

### Orquestación con Nx

Un solo grafo de Nx cubre backend y front:

- Los proyectos TypeScript se descubren con los plugins de `@nx/js`, `@nx/jest` y `@nx/eslint`, limitados a `backend/**`.
- `front/tools/nx-plugin` registra cada miembro del pub workspace como proyecto `front-<nombre>` con las tareas `analyze`, `format-check` y `test` (con caché). Las dependencias entre paquetes Dart salen de sus `pubspec.yaml`.
- `front-contracts` depende de los paquetes de `backend/libs/contracts`, así que un cambio de contrato marca como afectados los paquetes y microfrontends del front que lo usan.
- `pnpm nx affected -t lint test typecheck build analyze format-check` es el comando de CI y el de uso diario.

### Backend

```
backend/
  apps/<servicio>/src/
    modules/<módulo>/{domain,application,infrastructure,presentation}/
    shared/{enums,constants,types,utils}/   # compartido entre los módulos de ese servicio
  libs/
    contracts/
      platform/        # @contracts/platform: kit de contratos y piezas transversales
      <servicio>/      # @contracts/<servicio>: lo que el servicio expone a otros
        src/
          enums/       # solo enums
          constants/   # valores constantes y objetos `as const`
          types/       # tipos e interfaces (incluye `z.infer` de los esquemas)
          schemas/     # esquemas zod de entradas, salidas y payloads
          http/        # rutas públicas que consume el front
          internal/    # operaciones internas entre servicios
          events/      # eventos publicados
        export/contract.json   # generado, se confirma en git
    shared/
      utils/           # @shared/utils: funciones puras que usan los tipos de contracts
    platform/          # runtime: kernel, primitives, config, observability, saga...
  tools/               # generadores Nx y contracts-export
  infra/               # Terraform y entorno local
```

### Front

```
front/
  apps/{web,mobile}/
  microfrontends/<mf>/lib/src/
    screens/  data/  l10n/
    shared/{enums,constants,types,utils}/   # compartido entre pantallas del microfrontend
  packages/
    contracts/         # lib/src/core (a mano) y lib/src/<servicio>/{enums,constants,types,schemas,http} (generado)
    utils/             # funciones puras que usan los tipos de contracts
    api/               # ApiClient: valida la petición contra el contrato antes de llamar por HTTP
    shell_core/ ui/ tokens/ i18n/ auth/ realtime/
  tools/contracts_gen/ # genera Dart desde backend/libs/contracts/*/export/contract.json
```

### Reglas de dependencia

Dentro de cada paquete de contratos y de cada carpeta `shared/`:

| Carpeta                      | Puede importar                                           |
| ---------------------------- | -------------------------------------------------------- |
| `enums`                      | nada                                                     |
| `constants`                  | `enums`                                                  |
| `types`                      | `enums`, `constants`                                     |
| `schemas`                    | `enums`, `constants`, `types`                            |
| `http`, `internal`, `events` | todo lo anterior                                         |
| `utils`                      | `enums`, `constants`, `types` (y `schemas` para validar) |

Entre proyectos del backend (tags de Nx, regla `@nx/enforce-module-boundaries`):

- `type:contracts` depende solo de `type:contracts` y de zod.
- `type:util` depende de `type:contracts`.
- `type:platform` depende de `type:platform`, `type:util` y `type:contracts`.
- `type:app` depende de todo lo anterior, pero de otro servicio solo importa su paquete `@contracts/<servicio>`, nunca su código interno.

### Validar antes de llamar

Todo llamado entre procesos valida contra el contrato antes de salir por la red:

- Backend: `InternalClient.call(operación, entrada)` valida la entrada con el esquema de la operación. Si es inválida, devuelve el error de contrato sin hacer la llamada HTTP. La respuesta también se valida al llegar.
- Front: `ApiClient` valida la petición con el validador generado y lanza `ContractViolationException` con los mismos `FieldError` del servidor, sin llamar por HTTP. La respuesta se decodifica con el tipo generado.
- El servidor vuelve a validar siempre; validar en el cliente ahorra la llamada y da el error antes, pero la autoridad es el servidor.

### Una sola fuente de verdad

Los contratos se escriben en TypeScript con zod en `backend/libs/contracts`. `contracts-export` escribe `export/contract.json` (JSON Schema 2020-12 más metadatos de rutas, operaciones, eventos, enums y constantes). `front/tools/contracts_gen` genera el Dart. CI falla si el JSON o el Dart generado difieren de lo confirmado.

## Consecuencias

- `pnpm install` en la raíz instala Nx y el backend; `flutter pub get` en `front/` prepara el front. Después, todo se corre con Nx desde la raíz.
- Los enums de acceso (roles, permisos, planes, flags) pasan de Dart escrito a mano a TypeScript, y el front los recibe generados.
- Un cambio en un contrato del backend obliga a regenerar el Dart en el mismo cambio.
