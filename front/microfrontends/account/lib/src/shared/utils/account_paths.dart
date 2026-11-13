import '../constants/account_constants.dart';
import '../enums/account_enums.dart';

/// Ruta absoluta de [section], por ejemplo `/account/sessions`.
String accountPath(AccountSection section) => section.segment.isEmpty
    ? accountBasePath
    : '$accountBasePath/${section.segment}';
