---
name: front-pruebas
description: Cómo se escriben y ubican las pruebas del front de node_template (Flutter). Carpeta test/ que replica lib/src, controladores probados sin widgets, dobles como clases, sin esperas fijas y carga de librerías diferidas. Úsala al escribir o revisar pruebas del front.
---

# Pruebas del front

## Ubicación

- Las pruebas van en el `test/` de cada paquete, con las mismas subcarpetas que `lib/src`. Ejemplo: `lib/src/flows/sign_in_flow.dart` se prueba en `test/flows/sign_in_flow_test.dart`.
- No van dentro de `lib/`: Dart publicaría el código de prueba con el paquete, y `flutter_test` es una dependencia de desarrollo que `lib/` no puede importar.
- Los dobles compartidos se exportan desde `lib/testing.dart` del paquete dueño del puerto (por ejemplo `package:auth/testing.dart`).

## Cómo se escriben

- La lógica se prueba en los controladores y flujos, sin montar widgets.
- Las pruebas de widgets verifican lo que se ve y los eventos que salen, no la lógica.
- Los dobles son clases que implementan el puerto (`FakeAuthRepository`, `FakeTokenStore`), no mocks genéricos.
- Nunca `pump` con duraciones fijas para esperar algo asíncrono: `pumpAndSettle` o esperar la condición. Los tiempos que importan salen de un reloj inyectado o de los datos de prueba.
- Las suites que montan microfrontends llaman a `loadDeferredLibraries` de `package:shell_core/testing.dart` en `setUpAll`.
- No se filtran errores de layout (como el overflow) para que una prueba pase: se corrige el widget.

## Comprobaciones de CI

- `analyze`, `test` y `format-check` de cada proyecto del front.
- `check_microfrontend_boundaries` para las fronteras de import y `check_deferred_chunks` sobre el build web para la carga diferida.
- `contracts_gen --check` cuando cambian los contratos.
