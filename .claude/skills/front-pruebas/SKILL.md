---
name: front-pruebas
description: Cómo se escriben y ubican las pruebas del front de node_template (Flutter). Carpeta test/ que replica lib/src, controladores probados sin widgets, dobles como clases, pruebas de widgets con TestApp y pumpAtWidths, accesibilidad con expectAccessible, golden tests, sin esperas fijas y carga de librerías diferidas con DeferredLibrariesPreloader. Úsala al escribir o revisar pruebas del front.
paths:
  - 'front/**/test/**'
  - 'front/packages/test_utils/**'
---

# Pruebas del front

## Ubicación

- Las pruebas van en el `test/` de cada paquete, con las mismas subcarpetas que `lib/src`. Ejemplo: `lib/src/screens/tasks_list_controller.dart` se prueba en `test/screens/tasks_list_controller_test.dart`.
- No van dentro de `lib/`: Dart publicaría el código de prueba con el paquete, y `flutter_test` es una dependencia de desarrollo que `lib/` no puede importar.
- Los dobles y utilitarios que usan varios paquetes viven en `front/packages/test_utils` (`package:test_utils/test_utils.dart`), declarado solo en `dev_dependencies`. Lo que usa un solo microfrontend va en su `test/utils/`, como `TasksTestApp` en `test/utils/tasks_app.dart`. Nunca carpetas `testing/` ni `support.dart`.
- Siguen las mismas reglas que el código: clases, un archivo por clase y sin duplicación.

## Qué probar y dónde

| Pieza                           | Prueba                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------- |
| Controlador, flujo, repositorio | `test()` sin widgets, con dobles. Aquí vive la lógica.                            |
| Widget o pantalla               | `testWidgets`: lo que se ve y los eventos que salen.                              |
| Estados de la pantalla          | Cargando, datos, vacío y error. Los cuatro.                                       |
| Layout                          | Un ancho compacto y uno expandido con `pumpAtWidths`.                             |
| Accesibilidad                   | `expectAccessible` y escala 2x con `pumpAtTextScale` (ver `front-accesibilidad`). |
| Componentes de `ui`             | Opcional: golden tag `golden`.                                                    |

Cada regla de negocio nueva trae su prueba de controlador. Cada bug corregido trae la prueba que lo habría atrapado.

## Cómo se escriben

- Nombres que describen el comportamiento: `'an older answer never replaces a newer one'`, no `'works'`. `group` con el tipo bajo prueba (`group(TasksListController, ...)`) para que un renombre se propague.
- La lógica se prueba en los controladores y flujos, sin montar widgets.
- Las pruebas de widgets verifican lo que se ve y los eventos que salen, no la lógica. Se busca por texto localizado, por tipo o por `Semantics`; una `Key` solo cuando no hay otra forma estable.
- Los dobles son clases que implementan el puerto (`FakeAuthRepository`, `FakeTokenStore`, `FakeTasksRepository`), no mocks genéricos y sin `mockito` ni `mocktail`. Un doble puede tener una compuerta (un `Completer` por llamada, como `ScriptedTasksRepository`) para controlar el orden de las respuestas.
- Una falla de prueba es `FakeFailure` de `test_utils` (`const FakeFailure()`), que es una `Exception`. Nunca un `StateError` ni un `Error`: `AsyncValue.guard` y `ActionRunner` dejan pasar un `Error` y la prueba no vería el estado de error.
- Un doble de demostración se crea con `DemoBehavior()` sin retardo. Los fallos se programan con `failNext`.
- Estado mutable en `setUp` con `late`, sin variables de nivel superior que se compartan entre pruebas. Lo que hay que liberar se registra con `addTearDown`.
- Se prueba el comportamiento público; nunca un método privado directamente.
- Los tiempos salen de un `FakeClock` de `test_utils` (`clock: fake.now`) o de constantes del código bajo prueba (`TasksListController.searchDebounce`), no de números mágicos.
- Las suites que montan rutas con bibliotecas diferidas llaman a `const DeferredLibrariesPreloader().load(manifests)` en `setUpAll`. Su `///` explica por qué va ahí y no dentro de `testWidgets`.
- No se filtran errores de layout (como el overflow) para que una prueba pase: se corrige el widget.

## Esperar sin esperas fijas

- Lógica async sin widgets: `await pumpEventQueue()` o `await` del futuro del controlador.
- Widgets: `pumpAndSettle()` cuando todo termina solo. Con animación infinita (un `CircularProgressIndicator` en pantalla) `pumpAndSettle` no termina: se usa `pump()` y se espera la condición.
- Un `Timer` con retardo conocido se avanza con `tester.pump(duracionDelCodigo)`, usando la constante del código bajo prueba. Nunca `Future.delayed` ni `sleep` en una prueba.

## Pruebas de widgets, accesibilidad, layout y golden

Plantillas completas en [references/pruebas-de-widgets.md](references/pruebas-de-widgets.md): `TestApp` por paquete, los cuatro estados, ancho compacto y expandido, guías de accesibilidad, escala de texto y golden tests.

## Comprobaciones de CI

- `analyze`, `test` y `format-check` de cada proyecto del front.
- `check_microfrontend_boundaries` para las fronteras de import y `check_deferred_chunks` sobre el build web para la carga diferida.
- `contracts_gen --check` cuando cambian los contratos.

## Con pstack

Carga primero `pstack-en-node-template`: dice cómo se lee una skill de pstack en Claude Code y qué regla manda cuando pstack y el repositorio no coinciden. Si el plugin no está instalado, esta sección no aplica.

- `principle-test-behavior-not-implementation`: se afirma el estado del controlador y lo que pinta la pantalla, no llamadas a dobles.
- Para un bug con un objetivo de prueba barato: `tdd`, con la prueba que falla escrita antes del arreglo.
- Los transportes falsos de `test_utils` aplican las mismas reglas que el backend (cabeceras, cookies, errores) para que una prueba verde signifique algo.
