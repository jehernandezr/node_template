// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'assistant_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Spanish Castilian (`es`).
class AssistantLocalizationsEs extends AssistantLocalizations {
  AssistantLocalizationsEs([String locale = 'es']) : super(locale);

  @override
  String get title => 'Asistente';

  @override
  String get chatTitle => 'Conversación';

  @override
  String get newConversation => 'Nueva conversación';

  @override
  String get emptyConversations => 'Aún no tienes conversaciones';

  @override
  String get listError => 'No pudimos cargar tus conversaciones.';

  @override
  String get genericError => 'Ocurrió un error inesperado.';

  @override
  String get quotaExceeded => 'Alcanzaste el límite de consultas de tu plan.';

  @override
  String get inputHint => 'Escribe tu pregunta';

  @override
  String get send => 'Enviar';

  @override
  String get stop => 'Detener';

  @override
  String get streaming => 'Escribiendo...';

  @override
  String get stopped => 'Respuesta detenida.';

  @override
  String get sources => 'Fuentes';

  @override
  String usage(int input, int output) {
    return 'Tokens: $input de entrada y $output de salida';
  }

  @override
  String get toolRequestTitle => 'El asistente quiere ejecutar una acción';

  @override
  String get toolConfirm => 'Confirmar';

  @override
  String get toolCancel => 'Cancelar';

  @override
  String get toolConfirmed => 'Acción confirmada';

  @override
  String get toolRejected => 'Acción cancelada';
}
