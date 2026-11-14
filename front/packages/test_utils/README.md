# test_utils

Dobles y utilitarios de prueba que comparten varios paquetes del front. Solo se declara en `dev_dependencies`: el código de producción nunca lo importa.

- `FakeAuthRepository`, `FakeTokenStore` y `FakeDeviceKeyPort`: implementan los puertos de `auth`.
- `DeferredLibrariesLoader`: carga las librerías diferidas de los manifiestos antes de las pruebas de widgets.

Lo que solo usan las pruebas de un paquete va en el `test/utils/` de ese paquete.
