import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/probe_manifest.dart';

void main() {
  group(DeferredLibrariesPreloader, () {
    test('loads the screens and runs the lifecycle once', () async {
      final probe = ProbeManifest();

      await const DeferredLibrariesPreloader().load([probe.build()]);

      expect(probe.screenLoads, 2);
      expect(probe.initializeCalls, 1);
      expect(probe.disposeCalls, 1);
    });

    test('a manifest without a lifecycle loads its screens only', () async {
      var screenLoads = 0;
      final manifest = MicrofrontendManifest(
        id: const MicrofrontendId('plain'),
        platforms: const {AppPlatform.web},
        access: AccessRule.authenticated(),
        menu: const [],
        screens: [
          ScreenRoute(
            path: '/plain',
            loadLibrary: () async {
              screenLoads++;
            },
            builder: (scope, {params = const {}}) => const SizedBox(),
          ),
        ],
      );

      await const DeferredLibrariesPreloader().load([manifest]);

      expect(screenLoads, 1);
    });
  });

  group(DeferredLibrariesLoader, () {
    test('delegates to the preloader', () async {
      final probe = ProbeManifest();

      await const DeferredLibrariesLoader().load([probe.build()]);

      expect(probe.screenLoads, 2);
      expect(probe.initializeCalls, 1);
      expect(probe.disposeCalls, 1);
    });
  });
}
