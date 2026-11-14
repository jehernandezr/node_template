---
name: front-estructura
description: Cómo se organizan carpetas, dependencias y nombres del front de node_template. Un solo pub workspace, apps, paquetes compartidos y microfrontends, capas de lib/src, API pública por paquete y reglas de dependencia. Úsala al crear o mover paquetes, microfrontends, pantallas, archivos o pruebas del front.
---

# Estructura del front

## Workspace

- `front/` es un solo pub workspace: las dependencias se resuelven una vez en `front/` y hay un único `package_config.json`. Cada paquete declara `resolution: workspace`.
- Las versiones de dependencias externas son exactas, y se agrega una solo cuando Flutter o Dart no cubren la necesidad. Antes de agregar una, se escribe en el PR por qué reimplementarla sería imprudente o costoso.
- Nx orquesta los targets del front (`format-check`, `analyze`, `test`) con el plugin propio.

## Carpetas

```
front/
├── apps/            web y mobile: solo el shell de cada plataforma y su marco
├── packages/        api, auth, contracts, i18n, shell_core, shell_host, tokens, ui, utils
├── microfrontends/  account, assistant, backoffice, billing, notifications, tasks, verifier
└── tools/           contracts_gen y las comprobaciones de CI
```

- Dentro de cada paquete o microfrontend, el código público va en `lib/<paquete>.dart` y el privado en `lib/src/`. Lo que está en `lib/src` no se importa desde otro paquete (convención de Dart).
- `lib/<paquete>.dart` exporta con `export 'src/x.dart' show A, B;` solo lo que otros paquetes necesitan. Exportar un archivo entero filtra detalles de implementación.
- Los dobles de prueba compartidos de un paquete se exportan en `lib/testing.dart`.

## Capas dentro de un microfrontend

Un microfrontend organiza `lib/src` por capa. La dependencia va en un solo sentido: `screens` conoce a `data` y a `shared`, `data` conoce a `shared`, `shared` no conoce a nadie.

```
lib/src/
├── screens/     pantallas (widgets), controladores y flujos de esas pantallas
├── data/        puerto del repositorio, adaptador de API y adaptador de demostración
├── lifecycle/   ciclo de vida del microfrontend
├── l10n/        ARB y localizaciones generadas
└── shared/
    ├── enums/       sin imports internos
    ├── constants/   importa enums
    ├── types/       importa enums y constants
    └── utils/       importa las tres
```

- `screens/` agrupa por pantalla, no por tipo de widget: `tasks_list_screen.dart` y `tasks_list_controller.dart` conviven. Un widget que solo usa una pantalla es privado de su archivo o hermano suyo.
- Lo que dos microfrontends necesitan no se copia ni se importa del otro: sube a `front/packages` (`ui` para widgets, `utils` para funciones puras, `tokens` para diseño).
- `check_microfrontend_boundaries` comprueba estas fronteras en CI. Si una regla estorba, se discute el ADR 0018, no se rodea.

## Paquetes compartidos

- `ui` no conoce ningún microfrontend ni ningún dominio. `tokens` no depende de nada. `contracts` es generado: no se edita a mano.
- Un paquete expone puertos (clases abstractas) y adaptadores. Los adaptadores de API usan `ApiClient`; los de demostración viven junto al puerto o en `testing.dart`.
- El tema y los valores de diseño salen de `tokens` y `ui` (ver `front-layout-adaptable`).

## Compilado

- `flutter build` deja la salida en el `build/` de cada app, que está en `.gitignore`. El código fuente nunca convive con artefactos.
- Código generado (`l10n/generated`, `contracts`) no se edita a mano y se regenera con su herramienta (`flutter gen-l10n`, `contracts_gen`).

## Nombres de archivo y de clase

- snake_case con el rol en el nombre: `tasks_list_controller.dart`, `api_tasks_repository.dart`, `tasks_list_screen.dart`, `task_detail_view.dart`.
- Un archivo, una clase pública principal. Las clases privadas de apoyo pueden ir en el mismo archivo.
- La clase lleva el mismo rol que el archivo: `TasksListController`, `ApiTasksRepository`, `FakeTasksRepository`, `TasksListScreen`.
- Constantes agrupadas en clases `abstract final class` (`TasksPaths`, `AppSpacing`), no como una nube de constantes sueltas.
- Prefijo `Fake` para el adaptador en memoria, `Api` para el que habla con el servidor. Sin sufijos `Impl`.
