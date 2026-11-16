# test_utils

Dobles y utilitarios de prueba que comparten varios paquetes del front. Solo se declara en `dev_dependencies`: el código de producción nunca lo importa.

- `FakeAuthRepository`, `FakeTokenStore` y `FakeDeviceKeyPort`: implementan los puertos de `auth`.
- `FakeClock`: reloj que solo avanza cuando la prueba lo pide.
- `FakeFailure`: excepción que lanza un fake para simular una llamada fallida. Reemplaza a `StateError` en ese papel, porque un `StateError` es un error de programación y escapa de los manejadores `on Exception`.
- `TestApp`: monta `MaterialApp` o `MaterialApp.router` con los delegados compartidos, la sesión y el tema; `wrap` y `wrapRouter` devuelven el widget, y `pump` lo monta y deja un frame asentado.
- `SessionBuilder`: arma `UserSession` paso a paso, en lugar de literales repetidos. Con `tenantId: null` arma un operador de plataforma.
- `ProblemFixtures`: respuestas de problema (503, 403, 404 y un código libre) que comparten las pruebas de fallos.
- `TestScope`: un `MicrofrontendScope` de demo con los repositorios ya registrados con `withRepository`.
- `expectAccessible`: corre las cuatro guías de tamaño táctil y contraste sobre lo que está en pantalla.
- `pumpAtWidths`: monta una pantalla a cada ancho y llama a una comprobación con cada uno.
- `pumpAtTextScale`: monta una pantalla con la escala de texto de accesibilidad (2x por defecto).
- `DeferredLibrariesPreloader`: carga en `setUpAll` las librerías diferidas de los manifiestos, sus pantallas y su ciclo de vida.
- `DeferredLibrariesLoader`: legado que delega en `DeferredLibrariesPreloader`; se retira cuando sus llamadores migren.

Lo que solo usan las pruebas de un paquete va en el `test/utils/` de ese paquete.
