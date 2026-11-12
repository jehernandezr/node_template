// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'verifier_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class VerifierLocalizationsEn extends VerifierLocalizations {
  VerifierLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get title => 'Verifier';

  @override
  String get readyTitle => 'This device is ready';

  @override
  String get readyMessage =>
      'When someone tries to sign in to your account from another device, you will see the code to approve it here.';

  @override
  String get codeTitle => 'Verification code';

  @override
  String get codeMessage =>
      'Enter it on the device trying to sign in. Only you can see it.';

  @override
  String get codeLoading => 'Generating code...';

  @override
  String get codeFailed =>
      'We could not generate the code. Reopen this screen.';

  @override
  String get copyCode => 'Copy code';

  @override
  String get codeCopied => 'Code copied';

  @override
  String expiresIn(String remaining) {
    return 'Expires in $remaining';
  }

  @override
  String get contextTitle => 'Attempt details';

  @override
  String get browser => 'Browser';

  @override
  String get os => 'System';

  @override
  String get city => 'Approximate city';

  @override
  String get ip => 'IP address';

  @override
  String get denyButton => 'It was not me';

  @override
  String get denyDialogTitle => 'Block this attempt?';

  @override
  String get denyDialogBody =>
      'We will cancel this attempt and send you an alert by email and push.';

  @override
  String get denyConfirm => 'Yes, block it';

  @override
  String get blockedTitle => 'Attempt blocked';

  @override
  String get blockedBody =>
      'We blocked the attempt and sent an alert to your contact channels. Check your security if you do not recognize this activity.';

  @override
  String get denyFailed => 'We could not block the attempt. Try again.';
}
