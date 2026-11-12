# mf_tasks

Microfrontend de tareas: ejemplo de CRUD para web y móvil. Exporta `tasksManifest` y todas sus rutas viven bajo `/tasks`.

## Rutas

- `/tasks`: lista con filtro por estado, búsqueda y paginación por cursor ("Cargar más"). En ancho expandido muestra el detalle al lado.
- `/tasks/new`: crear tarea (hija de `/tasks`).
- `/tasks/:id`: detalle con editar y eliminar (con confirmación). Hija de `/tasks`, así un enlace directo tiene pila de navegación y botón atrás.
- `/tasks/:id/edit`: editar tarea (hija de `/tasks/:id`).

Las pantallas se obtienen en `lib/src/screens/builders.dart` (`buildTasksListScreen`, `buildTaskDetailScreen`, `buildTaskFormScreen`), que el manifiesto llama desde la biblioteca diferida. Cada builder toma su repositorio del `MicrofrontendScope` de la identidad actual.

## Datos

`TasksRepository` (`lib/src/data/`) es la única puerta a los datos. `FakeTasksRepository` guarda todo en memoria con un retardo corto. Los ids son UUIDv7, así ordenar por id es ordenar por creación, y el cursor de paginación es el último id de la página.

`changes()` emite después de cada alta, edición o baja. La lista y el detalle se recargan con ese evento, sin esperar a que la pantalla de edición regrese.

La búsqueda (`search`) no pagina. `FakeTasksRepository.failNext(error)` hace fallar las siguientes llamadas, para probar errores (`ApiErrorException` de `contracts`).

## Textos

Los textos propios están en `lib/src/l10n/app_es.arb` (plantilla) y `app_en.arb`. Se generan con `flutter gen-l10n` en `lib/src/l10n/generated/` (clase `TasksLocalizations`). Las palabras comunes (reintentar, cancelar, editar, eliminar, cargar más) vienen de `AppLocalizations` del paquete `i18n`.

## Pruebas

```sh
flutter analyze
flutter test
```
