# mf_tasks

Microfrontend de tareas: ejemplo de CRUD para web y móvil. Exporta `tasksManifest` y todas sus rutas viven bajo `/tasks` (`TasksPaths`). Solo modo demo: tareas aún no tiene contrato. Acepta el enlace `tasks/<id>`.

## Rutas

- `/tasks`: lista con filtro por estado, búsqueda y paginación por cursor ("Cargar más"). En ancho expandido muestra el detalle al lado, con la tarea elegida en `TasksListController.selectedId`. La búsqueda espera a que el usuario deje de escribir y descarta las respuestas de pedidos viejos.
- `/tasks/new`: crear tarea (hija de `/tasks`). Su estado es `TaskFormState`.
- `/tasks/:id`: detalle con editar y eliminar (con confirmación). Hija de `/tasks`, así un enlace directo tiene pila de navegación y botón atrás. Su estado es `TaskDetailState`, que controla `TaskDetailController`.
- `/tasks/:id/edit`: editar tarea (hija de `/tasks/:id`). Usa `TaskFormController`, que pasa de `TaskFormLoading` a `TaskFormEditing` y solo `TaskFormSaved` lleva a navegar.

Cada pantalla es un `StatelessWidget` que obtiene su controlador con `ControllerBuilder`. Las pantallas se reúnen en `lib/src/screens/tasks_screens.dart` (`TasksScreens.list`, `TasksScreens.detail`, `TasksScreens.form`), que el manifiesto llama desde la biblioteca diferida. Cada una toma su repositorio del `MicrofrontendScope` de la identidad actual, a través de `TasksData`.

## Datos

`TasksRepository` (`lib/src/data/`) es la única puerta a los datos. `TasksData` decide cómo se crea: en modo demo, `FakeTasksRepository` guarda todo en memoria. La latencia, los fallos programados y el reloj vienen de `DemoBehavior` de `shell_core`, que se puede pasar al repositorio. Los ids los genera `UuidV7Generator`: UUIDv7 con orden de creación, así ordenar por id es ordenar por creación, y el cursor de paginación es el último id de la página.

`changes()` emite después de cada alta, edición o baja. La lista y el detalle se recargan con ese evento, sin esperar a que la pantalla de edición regrese. El detalle no recarga mientras borra, para que la tarea no vuelva.

Para probar errores, `DemoBehavior.failNext(error, operation: TasksOperation.get)` hace fallar la siguiente llamada de esa operación. Sin `operation`, falla la siguiente llamada de cualquier tipo.

## Textos

Los textos propios están en `lib/src/l10n/app_es.arb` (plantilla) y `app_en.arb`. Se generan con `flutter gen-l10n` en `lib/src/l10n/generated/` (clase `TasksLocalizations`). Las palabras comunes (reintentar, cancelar, editar, eliminar, cargar más) vienen de `AppLocalizations` del paquete `i18n`.

## Pruebas

Las pruebas de pantalla y de controlador están en `test/screens/`, y las de datos en `test/data/`. Las utilidades (`TasksTestApp`, `ScriptedTasksRepository`) viven en `test/utils/`.

```sh
flutter analyze
flutter test
```
