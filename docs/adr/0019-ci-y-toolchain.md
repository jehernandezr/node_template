# 0019. CI, seguridad y versiones de herramientas

- Estado: aceptada
- Fecha: 2026-11-12

## Contexto

La auditoría del 12 de noviembre encontró que el CI solo cubría el workspace Nx: no había jobs de Flutter, Terraform, deriva de contratos ni verificación de microfrontends diferidos; las acciones se referenciaban por etiqueta móvil; no existía un check agregado y las versiones de Flutter y Terraform no estaban fijadas. Tras ADR 0015 el repositorio tiene dos aplicaciones (`backend/` y `front/`) y Nx en la raíz las orquesta en un solo grafo.

## Decisión

### Jobs de `ci.yml`

Un job `changes` (`dorny/paths-filter`) decide qué corre. Cada job tiene `timeout-minutes` y permisos mínimos (`contents: read`).

| Job            | Corre cuando cambia                                                 | Qué hace                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nx`           | cualquier cambio (Nx decide los proyectos afectados)                | pnpm + Node de `.nvmrc`, `flutter pub get`, caché de `.nx/cache`, `nx affected -t lint typecheck build analyze format-check` (el `typecheck` revisa también las pruebas), pruebas del backend con cobertura mínima (80 % en líneas, sentencias y funciones; 75 % en ramas), pruebas del front y `nx format:check` |
| `contracts`    | `backend/libs/contracts`, `front/packages/contracts`, `front/tools` | `nx run contracts-export:check` y `dart run contracts_gen --check`: falla si el JSON/Dart generado difiere del TypeScript                                                                                                                                                                                         |
| `web-deferred` | `front/**`                                                          | `flutter build web --release --source-maps` y `front/tools/check_deferred_chunks.dart`                                                                                                                                                                                                                            |
| `terraform`    | `backend/infra/**`                                                  | Terraform y tflint en las versiones de `.terraform-version` y `.tflint-version`, `terraform fmt -check -recursive`, `tf-validate.mjs` (init, validate y `terraform test` de cada stack y ejemplo), pruebas en Python de las Lambdas y scripts, shellcheck y tflint con el ruleset de AWS                          |
| `ci-ok`        | siempre                                                             | Agrega el resultado de todos los jobs                                                                                                                                                                                                                                                                             |

`ci-ok` usa `if: always()` y falla si algún job necesario terminó en `failure` o `cancelled`; `skipped` es válido (el filtro de rutas lo omitió). **Es el único check requerido** en la protección de la rama `main` (nombre del check: `ci-ok`). `ci-ok` agrega solo los jobs de `ci.yml`; `security.yml` corre aparte, y la protección de `main` la configura el dueño del repositorio (ADR 0020). Así los jobs condicionales no bloquean los PR que no los tocan.

### Verificación de chunks diferidos

`front/tools/check_deferred_chunks.dart` es un script independiente (sin pubspec). Falla si:

1. `main.dart.js.map` lista fuentes de `microfrontends/*/lib/src/{data,screens,l10n}`; o
2. algún texto ARB del backoffice (de 12 caracteres o más, para evitar coincidencias con palabras sueltas; los segmentos fuera de `{placeholders}`) aparece en `main.dart.js`, tanto literal como con los escapes `\xHH`/`\uHHHH` de dart2js.

Al introducirse, falló porque las fuentes de `microfrontends/notifications/lib/src/data/*` viajaban en el bundle inicial (el hallazgo "el fake de notificaciones viaja en el bundle inicial" de la auditoría). La migración de `mf_notifications` al contrato del ADR 0018 lo corrigió y hoy la comprobación pasa.

### Versiones de herramientas

- Node: `.nvmrc` de la raíz. pnpm: campo `packageManager` del `package.json` de la raíz.
- Flutter: `front/.flutter-version` (3.50.0). El CI la lee y la pasa a `subosito/flutter-action`.
- Terraform: `backend/infra/terraform/.terraform-version` (1.14.4; el código exige `>= 1.11`).
- Renovate cubre `.flutter-version` con un gestor de expresiones regulares y `.terraform-version` y `.nvmrc` con sus gestores nativos.

### Acciones fijadas por SHA

Toda acción de terceros se referencia por el SHA completo del commit con un comentario con la versión (`@<sha> # vX.Y.Z`). Renovate (`helpers:pinGitHubActionDigests`) mantiene los SHA al día. Las etiquetas anotadas se resuelven al commit, no al objeto de la etiqueta.

### `security.yml`

Corre en PR, en `main` y cada lunes:

- **gitleaks** con el CLI instalado desde la release fijada (8.30.1) y verificación SHA-256, sobre todo el historial. La versión y el checksum se actualizan a mano juntos (Renovate no los gestiona, para no abrir PR que fallen la verificación).
- **dependency-review-action** en PR (severidad alta o crítica).
- **OSV-Scanner** sobre `pnpm-lock.yaml` y `front/pubspec.lock`.
- **Trivy (config)** sobre `backend/infra/terraform` (HIGH y CRITICAL). Se eligió Trivy sobre Checkov por ser un solo binario sin dependencias de Python.
- **CodeQL** para `javascript-typescript`.

### Historial y `.env`

La auditoría anticipó que gitleaks marcaría el `.env` del commit `a076bb9`. Al ejecutar gitleaks 8.30.1 sobre el historial completo no se reportó ningún hallazgo (los valores son de desarrollo local y no coinciden con ninguna regla), y el usuario confirmó que nunca se usaron. Por eso **no se añade `.gitleaksignore`**. Si una versión futura de las reglas lo marcara, se agregará la huella (`gitleaks git --report-format json`, campo `Fingerprint`) de ese hallazgo concreto a `.gitleaksignore`, con un comentario que cite este ADR; no se reescribe el historial.

### Configuración del repositorio requerida

- Protección de `main`: exigir solo el check `ci-ok` y que la rama esté al día.
- Habilitar el grafo de dependencias (necesario para dependency-review) y el escaneo de código (CodeQL sube SARIF).
- Instalar la aplicación de Renovate.

## Consecuencias

- Un PR que solo toca documentación no ejecuta los jobs de código y aun así satisface `ci-ok`.
- Cambiar `ci.yml` ejecuta todos los jobs (está incluido en cada filtro).
- Actualizar una acción exige que Renovate (o una persona) resuelva el nuevo SHA; no hay etiquetas móviles.
