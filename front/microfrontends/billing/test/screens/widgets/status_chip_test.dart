import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_billing/src/screens/widgets/status_chip.dart';
import 'package:mf_billing/src/shared/enums/billing_enums.dart';

import '../../utils/contrast_check.dart';

void main() {
  group(StatusChip, () {
    testWidgets('every tone keeps text contrast in light and dark themes', (
      tester,
    ) async {
      await ContrastCheck.expectBothThemes(
        tester,
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final tone in StatusTone.values)
              StatusChip(label: tone.name, tone: tone),
          ],
        ),
      );
    });
  });
}
