# mf_backoffice

Microfrontend de backoffice de plataforma. Solo web y solo para roles de plataforma (`PlatformRole`) con segundo factor reciente. Sigue el contrato de microfrontend del [ADR 0018](../../../docs/adr/0018-contrato-de-microfrontend.md).

## Rutas

El manifiesto declara `screens: [ScreenRoute(...)]` anidadas bajo `/backoffice`. Cada pantalla es dueña de su única barra superior (`AppPage`); la navegación de secciones va dentro de la página.

| Ruta                      | Pantalla                                                               | Acceso extra            |
| ------------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `/backoffice`             | Resumen: tenants, sagas que requieren intervención, mensajes en DLQ    |                         |
| `/backoffice/tenants`     | Lista con búsqueda, filtros de región y estado                         |                         |
| `/backoffice/tenants/:id` | Detalle: plan, grupo de shards, usuarios y auditoría                   |                         |
| `/backoffice/sagas`       | Lista con filtro de estado; las que requieren intervención se resaltan | lectores de operaciones |
| `/backoffice/sagas/:id`   | Línea de tiempo de pasos, acciones manuales y auditoría                | (hereda)                |
| `/backoffice/dlq`         | Colas muertas                                                          | lectores de operaciones |
| `/backoffice/dlq/:queue`  | Mensajes de una cola concreta, con redistribución                      | (hereda)                |

## Acceso

Las reglas viven en `lib/src/shared/constants/backoffice_access.dart`:

- **Manifiesto:** `AccessRule.all([platformRoles(todos), mfa(backofficeMfaMaxAge)])`, con la ventana de step-up del contrato (`MfaRules.stepUpMaxAgeMinutes`). Un rol de plataforma sin segundo factor reciente va a la página de step-up del shell; un usuario sin rol de plataforma va a `forbidden`.
- **Lectura de operaciones** (sagas y DLQ): `superAdmin`, `support` y `readOnly`, con `ScreenRoute(access:)`. `finance` solo ve la parte de facturación: el resumen con la tarjeta de tenants y los tenants con su plan.
- **Acciones** (acciones manuales de saga y redistribución de DLQ): solo `superAdmin` y `support`, con `AccessGate`. Para los demás roles los botones no aparecen.

La interfaz solo oculta; la API vuelve a comprobar cada petición.

## Carga diferida

`lib/mf_backoffice.dart` es el manifiesto y se carga con el shell. Importa `shell_core`, las constantes de `src/shared/constants` y, como import diferido, `src/screens/screens.dart`. Nada de `src/{data,screens,l10n}` puede alcanzarse sin `deferred as` desde el manifiesto: los clientes lo descargarían y los textos ARB del backoffice aparecerían en `main.dart.js` (lo comprueba `front/tools/check_deferred_chunks.dart`). `test/deferred_boundary_test.dart` recorre el grafo de imports del manifiesto y vigila esta regla.

`src/screens/screens.dart` expone un punto de entrada por pantalla (`overviewPage(scope)`, `dlqPage(scope, queue: ...)`, ...), sin `BuildContext`. Cada uno obtiene el repositorio del `MicrofrontendScope` de la identidad actual y envuelve la pantalla en `BackofficeLocalized`, que añade `BackofficeLocalizations.delegate`. Los diálogos se abren con `showBackofficeDialog`, porque viven en el navegador raíz, fuera de la página.

## Estructura

```
lib/src/
  shared/
    enums/      TenantStatus, TenantRegion, SagaStatus, ... (no existen aún en package:contracts)
    constants/  rutas (BackofficePaths) y reglas de acceso
    types/      modelos de lectura (Tenant, Saga, AuditEntry, ...)
    utils/      formatTimestamp
  data/         BackofficeRepository (interfaz, ScopedResource) y FakeBackofficeRepository
  screens/      pantallas y widgets comunes (BackofficePage, AsyncBody, AuditTimeline)
  l10n/         ARB, código generado y etiquetas de enums
```

## Datos

`BackofficeRepository` es el contrato e implementa `ScopedResource`: el scope lo crea con `scope.get(...)` y lo libera al cambiar de identidad. `FakeBackofficeRepository` guarda los datos en memoria, una instancia por identidad, y lanza `ApiErrorException` con códigos de `PlatformErrorCode`. `package:contracts` todavía no publica las operaciones del backoffice; cuando lo haga, la implementación real usará `ApiClient` de `package:api` y los enums generados reemplazarán a los de `shared/enums`.

Los estados de carga, error y datos se muestran con `AsyncValueView`; los errores de una acción, con `showActionError` de `package:ui`.

## Localización

- `l10n.yaml` genera `BackofficeLocalizations` desde `lib/src/l10n/app_es.arb` (plantilla) y `app_en.arb`, en `lib/src/l10n/generated/`. El código generado se versiona.
- Las palabras compartidas (cancelar, confirmar, reintentar, errores de la plataforma) salen de `AppLocalizations` del paquete `i18n`.
- Las etiquetas de enums viven en `lib/src/l10n/backoffice_labels.dart`.

## Pruebas

```sh
flutter gen-l10n && flutter analyze && flutter test
```

Las pruebas montan las rutas reales con `backofficeManifest.buildRoutes(...)` (o con `buildShellRouter` para el acceso del manifiesto) y cubren manifiesto, frontera diferida, aislamiento del scope, l10n en es y en, estados y acceso por rol.
