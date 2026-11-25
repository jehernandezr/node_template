# mf_reports

Reports microfrontend. It exports `reportsManifest` and all its routes live under `/reports` (`ReportsPaths`). It serves both demo and live modes: in demo the data comes from `FakeReportsRepository` and in live from `ApiReportsRepository`, on top of `ApiClient` and the generated routes in `ReportsRoutes`.

## Routes

- `/reports`: report catalog. Choosing one shows its parameters (period, grouping and format) and generating it opens the new run.
- `/reports/runs`: the tenant's runs, newest first. They are read again while any is queued or running.
- `/reports/runs/:runId`: one run with its result and its download when it is ready.

Viewing the catalog and the runs requires `reports:read`; the generate button requires `reports:write`.

## Download

`ReportFileSaver` puts the file where the user picks it up: in the browser it downloads it with its name, and outside the browser it copies it to the clipboard, because the app has no folder of its own to save it in.

## Tests

```sh
flutter analyze
flutter test
```
