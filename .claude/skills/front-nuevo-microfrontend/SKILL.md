---
name: front-nuevo-microfrontend
description: 'Crear un microfrontend con front/tools/new_microfrontend.dart y lo que se escribe a mano. Úsala al crear o revisar un microfrontend nuevo.'
paths:
  - 'front/tools/new_microfrontend/**'
  - 'front/microfrontends/*/lib/*.dart'
---

# Microfrontend nuevo

El generador crea la estructura y el pegamento. Lo que queda es el dominio: el puerto del repositorio, un controlador y una pantalla por ruta, los textos y las pruebas. Las reglas de cada pieza están en `front-codigo`, `front-pruebas`, `front-i18n` y `front-accesibilidad`.

## Comando

```bash
dart run front/tools/new_microfrontend.dart reports --menu "Reportes" [--menu-en "Reports"] [--no-install]
```

- El id va en minúsculas, de 2 a 24 caracteres (`^[a-z][a-z0-9]{1,23}$`). Es el primer segmento de las rutas.
- `--menu-en` es opcional; por defecto es el id con mayúscula inicial.
- `--no-install` omite los tres pasos de instalación de abajo.

## Qué crea

En `front/microfrontends/reports`:

- `.gitignore`, `analysis_options.yaml`, `l10n.yaml` y `README.md`.
- `pubspec.yaml` (`mf_reports`, con versiones exactas) y `lib/mf_reports.dart`, con `reportsManifest`: la ruta de lista, la ruta hija del detalle y el acceso `ReportsAccess.read`.
- `lib/src/shared/`: `constants/reports_paths.dart` (`reportsId`, `reportsMenuLabel` y `ReportsPaths`), `constants/reports_access.dart` (`ReportsAccess.read = AccessRule.authenticated()`) y `constants/reports_demo.dart`; `enums/reports_operation.dart`; `types/reports_item.dart` y `types/reports_not_found_exception.dart`.
- `lib/src/data/`: `reports_repository.dart` (el puerto), `fake_reports_repository.dart` con `DemoBehavior`, y `reports_data.dart` con `RepositoryBinding.demoOnly`.
- `lib/src/screens/`: `reports_list_controller.dart` y `reports_detail_controller.dart` con `AsyncLoader`; `reports_list_screen.dart` y `reports_detail_screen.dart` con `ControllerBuilder`; `reports_screens.dart` con `ReportsScreens` estático y `DeferredLocalizations`; `screens.dart`.
- `lib/src/l10n/app_es.arb` y `app_en.arb`, y `test/` con `utils/reports_test_app.dart` (`ReportsTestApp`), `utils/scripted_reports_repository.dart`, `manifest_test.dart`, y pruebas de `data/`, `screens/` y `l10n/`.
- Agrega `  - microfrontends/reports` a `front/pubspec.yaml`.

Después, salvo `--no-install`, corre `flutter pub get` en `front/`, `flutter gen-l10n` y `dart format lib test` en el paquete nuevo.

El generador no edita las apps. Imprime lo que cada app necesita.

## Qué agregar a mano en cada app

El generador imprime tres piezas para cada app:

1. El import `import 'package:mf_reports/mf_reports.dart' show reportsManifest;`.
2. La línea `reportsManifest,` en la lista de `front/apps/web/lib/src/web_shell.dart` (`webManifests`) y en la de `front/apps/mobile/lib/src/mobile_shell.dart` (`mobileManifests`).
3. La dependencia `mf_reports` con `path: ../../microfrontends/reports` en `dependencies` de `front/apps/web/pubspec.yaml` y de `front/apps/mobile/pubspec.yaml`.

## Qué se escribe a mano

- **Puerto y datos:** el puerto `ReportsRepository` (una `abstract interface class` que implementa `ScopedResource`) y `FakeReportsRepository` con `DemoBehavior` para latencia y fallos. Los datos de demostración son `FakeReportsRepository.demoItems`; `reports_demo.dart` solo tiene la latencia. Un repositorio real no existe hasta que haya contrato.
- **Controladores:** uno por pantalla, con `AsyncLoader` para cada carga y `ActionRunner` si escribe, los dos escuchados con `addListener(notifyListeners)` y liberados en `dispose`. `start` carga y sirve también de reintento. Sin `State` con `Future`, sin `try/catch` de lógica.
- **Pantallas:** una por ruta, `StatelessWidget` con `ControllerBuilder`, con los cuatro estados.
- **Textos:** las claves nuevas en `app_es.arb` y `app_en.arb`, con placeholders.
- **Pruebas:** controladores sin widgets, pantallas con los cuatro estados, anchos compacto y expandido, `expectAccessible` y escala 2x.
- **Acceso:** `AccessRule.permissions([...])` con el `Permission` real cuando exista. Hoy `ReportsAccess.read` usa `AccessRule.authenticated()`, porque `Permission` no tiene un permiso de reportes.
- **Escritura:** si hay acciones que cambian datos, `ActionRunner`. Una acción sensible se protege con `AccessRule.mfa` y `context.can`, o con `scope.services.requestStepUp()` cuando la sesión no la cumple.
- **Enlaces profundos:** `deepLinks` en el manifiesto, solo si hacen falta.

## Piezas

- Manifiesto: dónde: `lib/mf_reports.dart`; qué hace: id, plataformas, modos, acceso, menú y rutas diferidas
- Constantes de rutas: dónde: `lib/src/shared/constants/`; qué hace: `ReportsPaths.list`, `ReportsPaths.detail(id)`, `idParam` e `idSegment`
- Puerto y datos demo: dónde: `lib/src/data/`; qué hace: `ReportsRepository`, `FakeReportsRepository`, `ReportsData.repository`
- Controlador: dónde: `lib/src/screens/*_controller.dart`; qué hace: Estado con `AsyncLoader`, acciones con `ActionRunner`
- Pantalla: dónde: `lib/src/screens/*_screen.dart`; qué hace: `ControllerBuilder` y `AsyncValueView`, sin lógica
- Puente de pantallas: dónde: `lib/src/screens/reports_screens.dart`; qué hace: `ReportsScreens` estático, con `DeferredLocalizations` y `scope.repository`
- Textos: dónde: `lib/src/l10n/*.arb`; qué hace: `ReportsLocalizations`, con placeholders

## Esquema del manifiesto y del puente

Igual que `tasks` (`mf_tasks.dart`). El manifiesto solo importa constantes, enums y el puente, con `deferred as`:

Ejemplo en `references/ejemplos.md`, sección "Esquema del manifiesto y del puente".

El puente es una clase estática. `DeferredLocalizations` carga los delegados con la pantalla, y el repositorio sale del binding del microfrontend:

Ejemplo en `references/ejemplos.md`, sección "Esquema del manifiesto y del puente".

## Checklist del revisor

- Ninguna pantalla tiene `State` con `Future`, `try/catch` ni `widget.repository.`.
- Cada controlador usa `AsyncLoader`, y `ActionRunner` si escribe. Su prueba no monta widgets.
- Cada pantalla tiene prueba de sus cuatro estados, un ancho compacto y uno expandido, `expectAccessible` y una prueba a 2x de escala.
- Colores desde `Theme` y `context.statusColors`; textos desde el ARB con placeholders; `AlignmentDirectional` y `EdgeInsetsDirectional`.
- Diálogos con `context.showLocalizedDialog`.
- `check_microfrontend_boundaries` y `check_deferred_chunks` en verde.
- Aceptación: `pnpm nx run-many -t format-check analyze test --projects=front-mf_<id> --skip-nx-cache`.

## Cambiar el generador

Las plantillas viven en `front/tools/new_microfrontend/templates/` como archivos `.tmpl`, con los marcadores `{{id}}`, `{{Pascal}}`, `{{menuEs}}`, `{{menuEn}}`, `{{menuEsJson}}` y `{{menuEnJson}}`. Un marcador desconocido hace fallar al generador antes de escribir nada. El formateador y el analizador no leen los `.tmpl`, así que cada cambio de plantilla se comprueba de punta a punta:

1. `pnpm nx run-many -t format-check analyze test --projects=front-new_microfrontend`.
2. Generar uno de prueba (`dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`) y correr `pnpm nx run-many -t format-check analyze test --projects=front-mf_reports --skip-nx-cache` y `check-structure.mjs --all .`.
3. Borrar `front/microfrontends/reports` y su línea en `front/pubspec.yaml`, y correr `flutter pub get` en `front/`. El de prueba no se versiona.

Las reglas de código de cada pieza están en [front-codigo](../front-codigo/SKILL.md), las de pruebas en [front-pruebas](../front-pruebas/SKILL.md), y los textos en [front-i18n](../front-i18n/SKILL.md).

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-build-the-lever`, `architect`, `feature`, `poteto-mode`.
