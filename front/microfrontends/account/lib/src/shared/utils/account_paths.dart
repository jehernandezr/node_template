import '../constants/account_constants.dart';
import '../enums/account_enums.dart';

/// Absolute path of [section], for example `/account/sessions`.
String accountPath(AccountSection section) => section.segment.isEmpty
    ? accountBasePath
    : '$accountBasePath/${section.segment}';
