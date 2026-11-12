# mf_backoffice

Microfrontend de backoffice de plataforma. Solo para roles de plataforma (`PlatformRole`), solo web.

## Rutas

Las rutas cuelgan de `/backoffice` como rutas anidadas. Cada pantalla tiene su propia `AppBar`; la navegación de secciones va dentro de la página.

| Ruta                      | Pantalla                                                               |
| ------------------------- | ---------------------------------------------------------------------- |
| `/backoffice`             | Resumen: tenants, sagas que requieren intervención, mensajes en DLQ    |
| `/backoffice/tenants`     | Lista con búsqueda, filtros de región y estado                         |
| `/backoffice/tenants/:id` | Detalle: plan, grupo de shards, usuarios y auditoría                   |
| `/backoffice/sagas`       | Lista con filtro de estado; las que requieren intervención se resaltan |
| `/backoffice/sagas/:id`   | Línea de tiempo de pasos, acciones manuales y auditoría                |
| `/backoffice/dlq`         | Colas muertas                                                          |
| `/backoffice/dlq/:queue`  | Mensajes de una cola concreta, con redistribución                      |

Las acciones manuales de una saga (reintentar paso, forzar compensación, marcar como resuelta) exigen un motivo y quedan en la auditoría. Redistribuir una DLQ pide confirmación.

## Carga diferida

`lib/mf_backoffice.dart` es el manifiesto y se carga con la shell. Solo importa `shell_core`, `go_router`, `material_ui` y, como import diferido, `src/screens/screens.dart`. Modelos, repositorio, fake, localizaciones y widgets no pueden importarse desde el manifiesto: si se importan, dejan de ser diferidos y los clientes los descargan. El test `test/deferred_boundary_test.dart` vigila esta regla.

`src/screens/screens.dart` expone un punto de entrada por ruta (`overviewPage`, `dlqPage`, ...). Cada uno obtiene el repositorio del `MicrofrontendScope` de la identidad actual y aplica `Localizations.override` con `BackofficeLocalizations.delegate`.

## Datos

`BackofficeRepository` (`lib/src/data/backoffice_repository.dart`) es el contrato. `FakeBackofficeRepository` es la implementación en memoria que se crea una vez por identidad. Los errores se lanzan como `ApiErrorException` y las pantallas los muestran con `ErrorView.fromException`. La implementación real irá contra la API interna del BFF `apps/backoffice-api`.

## Localización

- `l10n.yaml` genera `BackofficeLocalizations` desde `lib/src/l10n/app_es.arb` (plantilla) y `app_en.arb`, en `lib/src/l10n/generated/`. El código generado se versiona.
- Las palabras compartidas (cancelar, confirmar, volver, error genérico) salen de `AppLocalizations` del paquete `i18n`.
- Las etiquetas de enums viven en `lib/src/labels.dart`.

## Pruebas

```sh
flutter gen-l10n && flutter analyze && flutter test
```
