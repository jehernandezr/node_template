# mf_reports

Microfrontend de reportes. Exporta `reportsManifest` y todas sus rutas viven bajo `/reports` (`ReportsPaths`). Sirve los modos demo y live: en demo los datos vienen de `FakeReportsRepository` y en live de `ApiReportsRepository`, sobre `ApiClient` y las rutas generadas de `ReportsRoutes`.

## Rutas

- `/reports`: catálogo de reportes. Elegir uno muestra sus parámetros (periodo, agrupación y formato) y generarlo abre la ejecución nueva.
- `/reports/runs`: ejecuciones del tenant, la más nueva primero. Se vuelven a leer mientras alguna está en cola o en curso.
- `/reports/runs/:runId`: una ejecución con su resultado y su descarga cuando está lista.

Ver el catálogo y las ejecuciones pide `reports:read`; el botón de generar pide `reports:write`.

## Descarga

`ReportFileSaver` pone el archivo donde el usuario lo toma: en el navegador lo descarga con su nombre, y fuera de él lo copia al portapapeles, porque la app no tiene una carpeta propia donde guardarlo.

## Pruebas

```sh
flutter analyze
flutter test
```
