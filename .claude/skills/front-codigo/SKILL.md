---
name: front-codigo
description: Reglas de diseño del código del front de node_template (Flutter, Dart 3). Clases, composición e inyección por constructor, widgets que solo pintan, controladores probados sin widgets con AsyncLoader y ActionRunner, estados y errores tipados, async seguro, nombres y contrato de microfrontend. Úsala antes de escribir, revisar o integrar código en front/.
paths:
  - 'front/**'
---

# Código del front

El front es software enterprise, no scripting. Todo código nuevo, y todo código que se toque, sigue estas reglas. Las skills hermanas cubren el resto: `front-estructura`, `front-pruebas`, `front-accesibilidad`, `front-layout-adaptable`, `front-i18n`, `front-navegacion`, `front-rendimiento`, `front-seguridad`, `front-analisis` y `front-nuevo-microfrontend`.

## Clases, composición e inyección

- Cada pieza con comportamiento es una clase con una sola responsabilidad. Sus colaboradores llegan por el constructor como campos `final`, tipados con el puerto (clase abstracta o `interface class`), nunca con la implementación concreta.
- Composición antes que herencia. Las clases concretas son `final class`; los puertos son `abstract interface class`.
- Nada de instancias globales ni estado en variables de nivel superior. Las dependencias se arman en el shell (`ShellHost`) y llegan a cada microfrontend por `ShellServices` y su scope.
- Funciones de nivel superior solo para utilidades puras sin dependencias.
- El tiempo se inyecta. `Clock` (`typedef Clock = DateTime Function()`) y `systemClock` viven en `package:utils`, el único lugar con `DateTime.now()`. Un controlador recibe el `Clock` o un `Duration` por constructor. Nunca `DateTime.now()` ni `Timer` con tiempos fijos dentro de la lógica.
- Un solo pub workspace y mínimas dependencias. Los principios de Riverpod, BLoC o Freezed (estado inmutable, un solo dueño, eventos hacia arriba) se logran con `ChangeNotifier`, clases `final` y `sealed`. No se agregan esas librerías ni generadores de código.

## Capas

- **Widgets:** solo pintan estado y reenvían eventos. Sin llamadas HTTP, sin reglas de negocio, sin `try/catch` de lógica. Lo único permitido: mostrar u ocultar según estado, animaciones del propio widget, layout según el ancho y navegación simple. Una pantalla es un `StatelessWidget` con `ControllerBuilder`.
- **Controladores y flujos** (`ChangeNotifier`): tienen el estado de la pantalla y la lógica, y se prueban sin widgets. Ejemplos: `SignInFlow` y `StepUpFlow` de `auth`, `TasksListController`.
- **Repositorios:** puertos en el microfrontend o el paquete; adaptadores de API (sobre `ApiClient`) y de demostración (en memoria) elegidos por `RepositoryBinding` según el `ShellMode`.
- **Contratos:** solo los tipos generados en `front/packages/contracts`. Ningún código del front importa el backend.
- Flujo unidireccional: los datos bajan del repositorio al controlador y al widget; los eventos suben por métodos del controlador.

## Estados, errores y async

Detalle, firmas y ejemplos en [references/estado-y-errores.md](references/estado-y-errores.md). Resumen:

- El estado de una pantalla es un tipo cerrado: `AsyncValue<T>` de `ui` (`AsyncLoading`, `AsyncData`, `AsyncError`) o una jerarquía `sealed` propia. Nada de pares `bool isLoading` más `Object? error` que permiten combinaciones imposibles.
- Una carga la compone el controlador con `AsyncLoader<T>` de `ui`, que descarta la respuesta de una llamada vieja y no notifica después de `dispose`. Una acción del usuario pasa por `ActionRunner`, que devuelve un `ActionResult` (`ActionSucceeded`, `ActionFailed` o `ActionSkipped`).
- Solo la lógica que no cabe en un `AsyncLoader` (búsqueda con filtros y paginación, como `TasksListController.reload`) lleva un `_requestId` propio.
- El controlador expone estado inmutable. Cambia el estado asignando un valor nuevo y llamando a `notifyListeners`, nunca mutando una lista que ya se entregó.
- En un widget, después de cada `await` se revisa `context.mounted` antes de usar el `context`. Los resultados de una acción se muestran con `showActionResult`.
- `AsyncValue.guard` y `ActionRunner` atrapan solo `Exception`: un `Error` es un bug y escapa. Un `catch` sin `on` solo se escribe con la marca `// catch-all: <motivo>` en la línea anterior, en un punto que reporta el fallo.
- Las fallas esperadas son excepciones tipadas (`ApiErrorException` con su código del contrato, `SignedOutException`). Un texto de error del servidor nunca se muestra: se traduce con `ErrorPresenter` de `i18n`.
- Timers, suscripciones y `StreamController` se cancelan en `dispose`. Un recurso por identidad implementa `ScopedResource`.

## Microfrontends

- Cumplen el contrato del ADR 0018: manifiesto con `id`, `platforms`, `modes`, `access`, `menu`, `deepLinks` y `screens` con `ScreenRoute.deferred`.
- Dependen solo de `front/packages`, nunca de otro microfrontend. Se comunican por eventos del shell y por rutas.
- Pantallas, datos y textos van detrás de `deferred as`. El manifiesto solo importa constantes, enums y el ciclo de vida.
- El repositorio de cada microfrontend se declara con `RepositoryBinding` en `data/` y la pantalla lo pide con `scope.repository(...)`. Los fakes reciben `DemoBehavior` para la latencia y los fallos programados.

## Dart 3

Detalle en [references/dart3.md](references/dart3.md). Resumen:

- `sealed` más `switch` exhaustivo para estados y resultados: el compilador avisa cuando falta un caso. Sin rama `_` sobre un `sealed` o un enum propio, para que agregar un caso rompa la compilación donde falta tratarlo.
- Records para devolver dos o tres valores sin clase (`(String name, int count)`). Si el valor viaja por capas o se nombra en la API pública, es una clase.
- Pattern matching para decodificar mapas y listas de entrada y para desestructurar. No para sustituir un `if (x is T)` simple.
- Constructores primarios (Dart 3.12 o superior, el workspace usa 3.14) permitidos en código nuevo cuando quitan repetición. No se migra código existente solo por estilo.

## Clean Code

- Nombres que dicen qué es y siguen el rol: `TasksListController`, `ApiTasksRepository`, `TasksListScreen`, `taskStatusLabel`. Sin prefijos de tecnología ni nombres que choquen con tipos de Flutter (`Page`, `Route`, `State`, `Theme` a secas).
- Booleanos con forma de pregunta (`isLoading`, `hasMore`, `canRetry`). Sin parámetros booleanos posicionales que cambian el comportamiento: dos métodos o un enum.
- Métodos cortos. Un `build` que supera unas 60 líneas se parte en widgets (clases `StatelessWidget`), no en métodos `_buildX` que reconstruyen todo en cada cambio.
- Enums generados para permisos, errores, planes y flags. Nunca literales de texto sueltos.
- Los textos de la interfaz salen de los ARB (ver `front-i18n`); nunca se muestra el texto que manda el servidor.
- El código se explica solo: sin comentarios en línea (`//`). Si un bloque necesita uno, se renombra o se extrae a un método o widget con nombre. La documentación es el `///` de cada método y miembro público, que sigue `front-analisis`.

## Antes de integrar el trabajo de un agente

Revisa que el diff cumpla esta skill, `front-estructura` y `front-pruebas`, y la que aplique al cambio (accesibilidad, layout, i18n, navegación, rendimiento, seguridad). Si no cumple, se corrige antes del commit.

## Con pstack

Carga primero `pstack-en-node-template`: dice cómo se lee una skill de pstack en Claude Code y qué regla manda cuando pstack y el repositorio no coinciden. Si el plugin no está instalado, esta sección no aplica.

- `principle-model-the-domain` y `principle-type-system-discipline`: estados de pantalla como clases selladas con `switch` exhaustivo, sin banderas sueltas.
- `principle-laziness-protocol` y `principle-minimize-reader-load`: sin capas ni envoltorios de un solo uso entre widget, controlador y repositorio.
- Antes de una pantalla o un flujo no trivial: `architect` para fijar el puerto del repositorio, el controlador y sus estados.
- Al revisar un diff del front: `interrogate`, y `blast-radius` si toca `shell_core`, `auth` o `api`.
