---
name: front-estructura
description: Cómo se organizan carpetas y dependencias del front de node_template. Un solo pub workspace, apps, paquetes compartidos y microfrontends, carpetas de lib/src y lo compartido de cada microfrontend. Úsala al crear o mover paquetes, microfrontends, pantallas o pruebas del front.
---

# Estructura del front

## Workspace

- `front/` es un solo pub workspace: las dependencias se resuelven una vez en `front/` y hay un único `package_config.json`. Cada paquete declara `resolution: workspace`.
- Las versiones de dependencias externas son exactas, y se agrega una solo cuando Flutter o Dart no cubren la necesidad.
- Nx orquesta los targets del front (`format-check`, `analyze`, `test`) con el plugin propio.

## Carpetas

```
front/
├── apps/            web y mobile: solo el shell de cada plataforma y su marco
├── packages/        api, auth, contracts, i18n, shell_core, shell_host, tokens, ui, utils
├── microfrontends/  account, assistant, backoffice, billing, notifications, tasks, verifier
└── tools/           contracts_gen y las comprobaciones de CI
```

- Dentro de cada paquete o microfrontend, el código público va en `lib/<paquete>.dart` y el privado en `lib/src/`. Es convención de Dart: lo que está en `lib/src` no se importa desde otro paquete.
- Un microfrontend organiza `lib/src` por capa: `screens/`, `data/`, `lifecycle/`, `l10n/` y `shared/{enums,constants,types,utils}`.
- Los dobles de prueba compartidos de un paquete se exportan en `lib/testing.dart`.

## Compilado

- `flutter build` deja la salida en el `build/` de cada app, que está en `.gitignore`. El código fuente nunca convive con artefactos.

## Nombres de archivo

- snake_case con el rol en el nombre: `tasks_list_controller.dart`, `api_tasks_repository.dart`, `tasks_list_screen.dart`.
- Un archivo, una clase pública principal.
