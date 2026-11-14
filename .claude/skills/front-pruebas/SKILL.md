---
name: front-pruebas
description: Cómo se escriben y ubican las pruebas del front de node_template (Flutter). Carpeta test/ que replica lib/src, controladores probados sin widgets, dobles como clases, pruebas de widgets con pumpApp, accesibilidad y layout, golden tests, sin esperas fijas y carga de librerías diferidas. Úsala al escribir o revisar pruebas del front.
---

# Pruebas del front

## Ubicación

- Las pruebas van en el `test/` de cada paquete, con las mismas subcarpetas que `lib/src`. Ejemplo: `lib/src/flows/sign_in_flow.dart` se prueba en `test/flows/sign_in_flow_test.dart`.
- No van dentro de `lib/`: Dart publicaría el código de prueba con el paquete, y `flutter_test` es una dependencia de desarrollo que `lib/` no puede importar.
- Los dobles compartidos se exportan desde `lib/testing.dart` del paquete dueño del puerto (por ejemplo `package:auth/testing.dart`).
- Utilidades de prueba de un paquete (`pumpApp`, `setSurface`) viven en `test/support/`, como en `packages/ui/test/support/pump.dart`.

## Qué probar y dónde

| Pieza                           | Prueba                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------- |
| Controlador, flujo, repositorio | `test()` sin widgets, con dobles. Aquí vive la lógica.                          |
| Widget o pantalla               | `testWidgets`: lo que se ve y los eventos que salen.                            |
| Estados de la pantalla          | Cargando, datos, vacío y error. Los cuatro.                                     |
| Layout                          | Un ancho compacto y uno expandido con `setSurface`.                             |
| Accesibilidad                   | Guías de `flutter_test` en los widgets compartidos (ver `front-accesibilidad`). |
| Componentes de `ui`             | Opcional: golden tag `golden`.                                                  |

Cada regla de negocio nueva trae su prueba de controlador. Cada bug corregido trae la prueba que lo habría atrapado.

## Cómo se escriben

- Nombres que describen el comportamiento: `'an older answer never replaces a newer one'`, no `'works'`. `group` con el tipo bajo prueba (`group(TasksListController, ...)`) para que un renombre se propague.
- La lógica se prueba en los controladores y flujos, sin montar widgets.
- Las pruebas de widgets verifican lo que se ve y los eventos que salen, no la lógica. Se busca por texto localizado, por tipo o por `Semantics`; una `Key` solo cuando no hay otra forma estable.
- Los dobles son clases que implementan el puerto (`FakeAuthRepository`, `FakeTokenStore`, `FakeTasksRepository`), no mocks genéricos y sin `mockito` ni `mocktail`. Un doble puede registrar llamadas o tener una compuerta (`_GatedRepository`) para controlar el orden de las respuestas.
- Estado mutable en `setUp` con `late`, sin variables de nivel superior que se compartan entre pruebas. Lo que hay que liberar se registra con `addTearDown`.
- Se prueba el comportamiento público; nunca un método privado directamente.
- Los tiempos salen de un reloj inyectado o de constantes del código bajo prueba (`TasksListController.searchDebounce`), no de números mágicos.
- Las suites que montan microfrontends llaman a `loadDeferredLibraries` de `package:shell_core/testing.dart` en `setUpAll`.
- No se filtran errores de layout (como el overflow) para que una prueba pase: se corrige el widget.

## Esperar sin esperas fijas

- Lógica async sin widgets: `await pumpEventQueue()` o `await` del futuro del controlador.
- Widgets: `pumpAndSettle()` cuando todo termina solo. Con animación infinita (un `CircularProgressIndicator` en pantalla) `pumpAndSettle` no termina: se usa `pump()` y se espera la condición.
- Un `Timer` con retardo conocido se avanza con `tester.pump(duracionDelCodigo)`, usando la constante del código bajo prueba. Nunca `Future.delayed` ni `sleep` en una prueba.

## Pruebas de widgets, accesibilidad, layout y golden

Plantillas completas en [references/pruebas-de-widgets.md](references/pruebas-de-widgets.md): `pumpApp` por paquete, los cuatro estados, ancho compacto y expandido, guías de accesibilidad, escala de texto y golden tests.

## Comprobaciones de CI

- `analyze`, `test` y `format-check` de cada proyecto del front.
- `check_microfrontend_boundaries` para las fronteras de import y `check_deferred_chunks` sobre el build web para la carga diferida.
- `contracts_gen --check` cuando cambian los contratos.
