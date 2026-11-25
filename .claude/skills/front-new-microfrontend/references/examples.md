# front-new-microfrontend examples

Long examples the skill cites. Read them only when the topic applies to you.

## Manifest outline

```dart
import 'src/screens/screens.dart' deferred as screens;

final MicrofrontendManifest reportsManifest = MicrofrontendManifest(
  id: reportsId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: ReportsAccess.read,
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: reportsMenuLabel,
      path: ReportsPaths.list,
      order: 100,
      icon: Icons.folder_outlined,
      selectedIcon: Icons.folder,
    ),
  ],
  screens: [
    ScreenRoute.deferred(
      ReportsPaths.list,
      library: screens.loadLibrary,
      build: (scope, params) => screens.ReportsScreens.list(scope),
      routes: [
        ScreenRoute.deferred(
          ReportsPaths.idSegment,
          library: screens.loadLibrary,
          build: (scope, params) => screens.ReportsScreens.detail(
            scope,
            itemId: params.require(ReportsPaths.idParam),
          ),
        ),
      ],
    ),
  ],
);
```

## Bridge outline

```dart
abstract final class ReportsScreens {
  static Widget list(MicrofrontendScope scope) =>
      _withTexts(ReportsListScreen(repository: _repository(scope)));

  static Widget detail(MicrofrontendScope scope, {required String itemId}) =>
      _withTexts(
        ReportsDetailScreen(repository: _repository(scope), itemId: itemId),
      );

  static ReportsRepository _repository(MicrofrontendScope scope) =>
      scope.repository(ReportsData.repository);

  static Widget _withTexts(Widget child) => DeferredLocalizations(
    delegates: const [ReportsLocalizations.delegate],
    child: child,
  );
}
```
